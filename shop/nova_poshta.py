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
        errors = data.get("errors", [])
        logger.error("NP API %s.%s помилка: %s", model, method, errors)
    except Exception:
        logger.exception("NP API %s.%s: помилка запиту", model, method)
    return []


def get_tracking_status(ttn: str) -> dict | None:
    """
    Повертає словник з полями StatusCode, Status, PaymentStatus тощо
    або None якщо запит не вдався.
    Статус-коди НП: 9=Вручено, 10=Відмова від отримання,
                    11/101/102/14=повернення відправнику.
    """
    data = _call("TrackingDocument", "getStatusDocuments", {
        "Documents": [{"DocumentNumber": ttn}]
    })
    if data:
        return data[0]
    return None


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


_SENDER_REFS_CACHE_KEY = "np_sender_refs"
_SENDER_REFS_CACHE_TTL = 60 * 60 * 24  # 24 години


def _get_sender_refs() -> tuple[str, str]:
    """
    Повертає (sender_ref, contact_ref) для відправника.
    Refs кешуються на 24 години — вони статичні для одного API-ключа.
    """
    from django.core.cache import cache

    cached = cache.get(_SENDER_REFS_CACHE_KEY)
    if cached:
        logger.debug("NP sender refs: cache hit")
        return cached

    logger.info("NP sender refs: cache miss, fetching from API")

    senders = _call("Counterparty", "getCounterparties", {
        "CounterpartyProperty": "Sender",
        "Page": "1",
    })
    if not senders:
        logger.error("_get_sender_refs: getCounterparties повернув пустий список")
        return "", ""

    sender_ref = senders[0].get("Ref", "")

    contacts = _call("Counterparty", "getCounterpartyContactPersons", {
        "Ref": sender_ref,
    })
    if not contacts:
        logger.error("_get_sender_refs: getCounterpartyContactPersons повернув пустий список")
        return sender_ref, ""

    contact_ref = contacts[0].get("Ref", "")
    result = (sender_ref, contact_ref)
    cache.set(_SENDER_REFS_CACHE_KEY, result, _SENDER_REFS_CACHE_TTL)
    logger.info("NP sender refs збережено в кеш: sender=%s contact=%s", sender_ref, contact_ref)
    return result


def clear_sender_refs_cache() -> None:
    """Скидає кеш refs відправника. Викликати після зміни API-ключа."""
    from django.core.cache import cache
    cache.delete(_SENDER_REFS_CACHE_KEY)
    logger.info("NP sender refs cache cleared")


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

    # Крок 1: реєструємо ОТРИМУВАЧА через API
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

    # Крок 2: отримуємо refs відправника динамічно
    sender_ref, sender_contact_ref = _get_sender_refs()
    if not sender_ref or not sender_contact_ref:
        logger.error("create_ttn: не вдалося отримати refs відправника")
        return None

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
        "Weight":        "1.0",
        "SeatsAmount":   "1",
        "OptionsSeat": [
            {
                "weight":          "1.0",
                "volumetricWeight": "1.0",
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


def delete_ttn(ttn: str) -> bool:
    """
    Видаляє/відмовляється від інтернет-документа (ТТН) у НП.
    Повертає True якщо успішно, False — якщо помилка.

    НП дозволяє видалити документ тільки поки він ще не передано
    в доставку (статус «Нова пошта прийняла» або раніше).
    """
    result = _call("InternetDocument", "delete", {
        "DocumentRefs": [ttn],
    })
    if result:
        logger.info("delete_ttn: ТТН %s успішно видалено з НП", ttn)
        return True
    logger.warning("delete_ttn: не вдалося видалити ТТН %s з НП (можливо вже передано в доставку)", ttn)
    return False
