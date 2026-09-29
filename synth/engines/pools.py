"""Faker-based value pools.

Pools are built once per (locale, provider, seed) with 5000 values.
Rows index into pools with NumPy integers for determinism.
Safe identifiers only (TRD §8.3): RFC 2606/6761 domains, reserved phone ranges.
"""
from __future__ import annotations

from typing import Any

from faker import Faker

_POOL_CACHE: dict[tuple[str, str, int, int], list[Any]] = {}

# Safe domains per RFC 2606 / 6761
SAFE_EMAIL_DOMAINS = ["example.com", "example.org", "example.net"]


def _generate_pool_values(fake: Faker, provider: str, size: int) -> list[Any]:
    """Generate a pool of values using Faker and safe identifier rules."""
    values: list[Any] = []

    if provider in ("person_name", "name"):
        return [fake.name() for _ in range(size)]
    elif provider == "first_name":
        return [fake.first_name() for _ in range(size)]
    elif provider == "last_name":
        return [fake.last_name() for _ in range(size)]
    elif provider == "email":
        domains_len = len(SAFE_EMAIL_DOMAINS)
        for i in range(size):
            domain = SAFE_EMAIL_DOMAINS[i % domains_len]
            user = fake.user_name().replace(".", "").lower()
            values.append(f"{user}{i}@{domain}")
        return values
    elif provider in ("phone", "phone_number"):
        # Reserved phone ranges per TRD §8.3
        # US: 555-0100 to 555-0199
        for i in range(size):
            num = 100 + (i % 100)
            values.append(f"555-01{num:02d}")
        return values
    elif provider in ("street_address", "address"):
        return [fake.street_address() for _ in range(size)]
    elif provider == "city":
        return [fake.city() for _ in range(size)]
    elif provider in ("country", "country_name"):
        return [fake.country() for _ in range(size)]
    elif provider in ("company", "company_name"):
        return [fake.company() for _ in range(size)]
    elif provider in ("job_title", "job"):
        return [fake.job() for _ in range(size)]
    elif provider in ("postal_code", "postcode"):
        return [fake.postcode() for _ in range(size)]
    elif provider in ("text_short", "text"):
        return [fake.sentence(nb_words=6) for _ in range(size)]
    elif provider == "product_name":
        adjectives = ["Pro", "Ultra", "Lite", "Smart", "Eco", "Prime", "Max", "Flex"]
        nouns = ["Device", "Sensor", "Hub", "Widget", "Gear", "Cable", "Pad", "Tool"]
        for i in range(size):
            adj = adjectives[i % len(adjectives)]
            noun = nouns[(i // len(adjectives)) % len(nouns)]
            values.append(f"{adj} {noun} {i+1}")
        return values
    else:
        # Fallback to general word or text
        return [f"item_{i+1}" for i in range(size)]


def build_pool(locale: str, provider: str, seed: int, size: int = 5000) -> list[Any]:
    """Build and cache a deterministic pool of fake values."""
    cache_key = (locale, provider, seed, size)
    if cache_key in _POOL_CACHE:
        return _POOL_CACHE[cache_key]

    fake = Faker(locale)
    fake.seed_instance(seed)

    values = _generate_pool_values(fake, provider, size)
    _POOL_CACHE[cache_key] = values
    return values
