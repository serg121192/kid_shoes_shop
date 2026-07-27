#!/usr/bin/env python3
"""Опитування Delta UPS через SNMPv1 (DeltaUPS-MIB)."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Any

from pysnmp.hlapi.v1arch.asyncio import (
    CommunityData,
    ObjectIdentity,
    ObjectType,
    SnmpDispatcher,
    UdpTransportTarget,
    get_cmd,
)

# Delta enterprise: .1.3.6.1.4.1.2254.2.4
OIDS = {
    "input_voltage": "1.3.6.1.4.1.2254.2.4.4.3.0",  # dupsInputVoltage1, 0.1 V
    "temperature": "1.3.6.1.4.1.2254.2.4.7.9.0",  # dupsTemperature, °C
    "output_source": "1.3.6.1.4.1.2254.2.4.5.1.0",  # dupsOutputSource
    "battery_charge": "1.3.6.1.4.1.2254.2.4.7.8.0",  # dupsBatteryCapacity, %
}

OUTPUT_SOURCE = {
    0: "normal",  # мережа (utility)
    1: "battery",
    2: "bypass",
    3: "reducing",
    4: "boosting",
    5: "manualBypass",
    6: "other",
    7: "none",
}


async def snmp_get_many(
    host: str,
    community: str,
    oids: list[str],
    port: int = 161,
    timeout: float = 3.0,
) -> dict[str, Any]:
    dispatcher = SnmpDispatcher()
    target = await UdpTransportTarget.create((host, port), timeout=timeout, retries=1)

    error_indication, error_status, error_index, var_binds = await get_cmd(
        dispatcher,
        CommunityData(community, mpModel=0),  # SNMPv1
        target,
        *[ObjectType(ObjectIdentity(oid)) for oid in oids],
    )

    if error_indication:
        raise RuntimeError(str(error_indication))
    if error_status:
        loc = var_binds[int(error_index) - 1][0] if error_index else "?"
        raise RuntimeError(f"{error_status.prettyPrint()} at {loc}")

    return {str(oid): value for oid, value in var_binds}


async def poll_ups(host: str, community: str, port: int = 161) -> dict[str, Any]:
    values = await snmp_get_many(host, community, list(OIDS.values()), port)

    raw_voltage = int(values[OIDS["input_voltage"]])
    temperature = int(values[OIDS["temperature"]])
    source_code = int(values[OIDS["output_source"]])
    battery_charge = int(values[OIDS["battery_charge"]])

    source = OUTPUT_SOURCE.get(source_code, f"unknown({source_code})")
    on_mains = source_code == 0  # normal = живлення від мережі

    return {
        "host": host,
        "input_voltage_v": round(raw_voltage / 10.0, 1),
        "temperature_c": temperature,
        "on_mains": on_mains,
        "power_source": source,
        "battery_charge_percent": battery_charge,
    }


def format_text(data: dict[str, Any]) -> str:
    mains = "так (мережа)" if data["on_mains"] else f"ні ({data['power_source']})"
    return (
        f"UPS {data['host']}\n"
        f"  Вхідна напруга : {data['input_voltage_v']} V\n"
        f"  Температура    : {data['temperature_c']} °C\n"
        f"  В мережі       : {mains}\n"
        f"  Заряд батареї  : {data['battery_charge_percent']} %"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Опитування Delta UPS через SNMPv1")
    parser.add_argument("host", help="IP або hostname SNMP-карти UPS")
    parser.add_argument(
        "-c",
        "--community",
        default="public",
        help="SNMP community (за замовчуванням: public)",
    )
    parser.add_argument("-p", "--port", type=int, default=161, help="UDP порт SNMP")
    parser.add_argument("--json", action="store_true", help="Вивід у JSON")
    args = parser.parse_args()

    try:
        data = asyncio.run(poll_ups(args.host, args.community, args.port))
    except Exception as exc:
        print(f"Помилка опитування UPS: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print(format_text(data))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
