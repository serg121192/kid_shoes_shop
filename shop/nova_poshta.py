import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

NOVA_API_URL = "https://api.novaposhta.ua/v2.0/json/"


def _call(model: str, method: str, properties: dict) -> list:
    payload = {
        "apiKey": settings.NOVA_POSHTA_API_KEY,
        "modelName": model,
        "calledMethod": method,
        "methodProperties": properties,
    }

    try:
        response = requests.post(NOVA_API_URL, json=payload, timeout=5)
        response.raise_for_status()
        data = response.json()
        if data.get("success"):
            return data.get("data", [])
        # NP повернула success=false — логуємо помилки
        errors = data.get("errors", [])
        logger.error("NP API %s.%s помилка: %s", model, method, errors)
    except Exception:
        logger.exception("NP API %s.%s: помилка запиту", model, method)
    return []


def get_cities_list(query: str) -> list[dict]:
    cities = _call("Address", "searchSettlements", {
        "CityName": query,
        "Limit": 20,
    })

    results = []
    for city in cities:
        for address in city.get("Addresses", []):
            results.append(
                {
                    "ref": address.get("DeliveryCity") or address.get("Ref", ""),
                    "name": address.get("Present", ""),
                }
            )
    
    return results


def get_warehouses_list(
    city_ref: str,
    query: str = "",
    warehouse_type: str = "warehouse",
) -> list[dict]:

    type_ref_map = {
        "warehouse": "841339c7-591a-42e2-8233-7a0a00f0ed6f",
        "postamat": "f9316480-5f2d-425d-bc2c-ac7cd29decf0"
    }

    properties = {
        "CityRef": city_ref,
        "Limit": 50 if query else 500,
        "TypeOfWarehouseRef": type_ref_map.get(warehouse_type, ""),
    }

    if query:
        properties["FindByString"] = query

    warehouses = _call("Address", "getWarehouses", properties)

    return [
        {
            "ref": warehouse.get("Ref", ""),
            "name": warehouse.get("Description", ""),
            "number": warehouse.get("Number", ""),
            "address": warehouse.get("Address", ""),
        }
        for warehouse in warehouses
    ]


def create_ttn(delivery_info) -> str | None:
    """
    Створює інтернет-документ (ТТН) для замовлення.
    delivery_info — екземпляр DeliveryInfo з пов'язаним order.
    """
    SERVICE_TYPE_MAP = {
        "np_warehouse": "WarehouseWarehouse",
        "np_postamat":  "WarehousePostomat",
        "np_address":   "WarehouseDoors",
    }
    service_type = SERVICE_TYPE_MAP.get(delivery_info.delivery_type, "WarehouseWarehouse")

    # Крок 1: реєструємо ВІДПРАВНИКА через API
    # (для приватних осіб NP вимагає реєстрації через Counterparty.save;
    #  якщо контрагент з таким телефоном вже існує — NP поверне існуючий)
    senders = _call("Counterparty", "save", {
        "FirstName":            settings.NP_SENDER_FIRST_NAME,
        "MiddleName":           settings.NP_SENDER_MIDDLE_NAME,
        "LastName":             settings.NP_SENDER_LAST_NAME,
        "Phone":                settings.NP_SENDER_PHONES,
        "Email":                "",
        "CounterpartyType":     "PrivatePerson",
        "CounterpartyProperty": "Sender",
    })
    if not senders:
        logger.error("create_ttn: не вдалося зареєструвати відправника в NP")
        return None

    sender_ref = senders[0].get("Ref", "")
    sender_contact_ref = (
        senders[0]
        .get("ContactPerson", {})
        .get("data", [{}])[0]
        .get("Ref", "")
    )

    # Крок 2: реєструємо ОТРИМУВАЧА через API
    parts = delivery_info.recipient_full_name.split()
    recipients = _call("Counterparty", "save", {
        "FirstName":            parts[1] if len(parts) > 1 else "",
        "MiddleName":           parts[2] if len(parts) > 2 else "",
        "LastName":             parts[0] if len(parts) > 0 else "",
        "Phone":                delivery_info.recipient_phone,
        "Email":                "",
        "CounterpartyType":     "PrivatePerson",
        "CounterpartyProperty": "Recipient",
    })
    if not recipients:
        logger.error("create_ttn: не вдалося зареєструвати отримувача в NP")
        return None

    recipient_ref = recipients[0].get("Ref", "")
    recipient_contact_ref = (
        recipients[0]
        .get("ContactPerson", {})
        .get("data", [{}])[0]
        .get("Ref", "")
    )

    # Крок 3: формуємо ТТН
    total_price = str(int(delivery_info.order.total_price))

    documents = _call("InternetDocument", "save", {
        # Відправник
        "CitySender":     settings.NP_SENDER_CITY_REF,
        "Sender":         sender_ref,
        "SenderAddress":  settings.NP_SENDER_WAREHOUSE_REF,
        "ContactSender":  sender_contact_ref,
        "SendersPhone":   settings.NP_SENDER_PHONES,
        # Отримувач
        "CityRecipient":    delivery_info.city_ref,
        "Recipient":        recipient_ref,
        "RecipientAddress": delivery_info.warehouse_ref,
        "ContactRecipient": recipient_contact_ref,
        "RecipientsPhone":  delivery_info.recipient_phone,
        # Параметри відправлення
        "ServiceType":   service_type,
        "PaymentMethod": "Cash",
        "PayerType":     "Recipient",
        "Cost":          total_price,
        "CargoType":     "Cargo",
        "Weight":        "1",
        "SeatsAmount":   "1",
        "OptionsSeat": [
            {
                "volumetricWeight": "1",
                "volumetricLength": "30",
                "volumetricWidth":  "20",
                "volumetricHeight": "15",
            }
        ],
        "Description":   "Дитяче взуття",
        "DateTime":      "",
    })

    if not documents:
        return None

    return documents[0].get("IntDocNumber", None)
