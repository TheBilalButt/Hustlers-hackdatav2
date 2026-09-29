"""Golden test suite for Natural Language to IR conversion (T-10a).

Contains 30 diverse domain prompts covering SaaS, Banking, eCommerce,
Healthcare, Education, Logistics, HR, FinTech, and multi-region locales.
Reference: PRD FR-10, TRD §9.1, §12.
"""

from __future__ import annotations

import pytest

from synth.ir.models import Dataset
from synth.llm.router import LLMRouter

GOLDEN_PROMPTS = [
    # 1. SaaS & Subscriptions
    "B2B SaaS platform with monthly subscriptions, enterprise tiers, and recurring billing",
    "Cloud monitoring software with user accounts and monthly active subscriptions",
    "API developer platform with tiered usage plans and developer subscriptions",
    # 2. Banking & FinTech
    "Retail banking system with checking and savings accounts and daily transactions",
    "Personal finance app with bank accounts, debit cards, and balance histories",
    "Credit union with member deposits, personal loans, and interest schedules",
    # 3. eCommerce & Retail (US / Global)
    "Online fashion retail store with customer profiles, shopping orders, and order items",
    "Electronics marketplace with verified buyers, seller stores, and product orders",
    "Direct-to-consumer cosmetics brand with customer loyalty points and orders",
    # 4. Indian Locale & Tax
    "Indian D2C electronics shop with customer profiles, orders, and GST invoices in INR",
    "Mumbai grocery delivery startup with customer accounts, quick orders, and UPI payments",
    "Bangalore tech agency with Indian clients and GST tax billing statements",
    # 5. European / German Locale
    "German online furniture retailer with customers, EUR orders, and Berlin warehouse deliveries",
    "Munich cloud hosting provider with German enterprise client invoices in EUR",
    # 6. Healthcare & Medical
    "Hospital outpatient clinic with patient records, doctor consultations, and appointments",
    "Dental clinic appointment system with patient insurance details and treatment fees",
    "Diagnostic laboratory with patient test appointments and medical report statuses",
    # 7. Education & Academic
    "University student portal with course registrations, semesters, and grade transcripts",
    "Online learning platform with student enrollments, course lessons, and quiz scores",
    "High school administration system with student attendance and class schedules",
    # 8. Logistics & Supply Chain
    "Global freight shipping logistics with distribution warehouses and cargo tracking",
    "Urban last-mile parcel delivery fleet with warehouse dispatch and courier routes",
    "Cold chain food distribution with refrigerated warehouses and pallet shipments",
    # 9. HR & Workforce
    "Enterprise corporate HR system with employee roster, departments, and payroll salaries",
    "Staff recruitment tracking with employee records and compensation tiers",
    # 10. Real Estate & Hospitality
    "Commercial real estate property management with office spaces and tenant leases",
    "Boutique hotel booking engine with room reservations, guest check-ins, and invoices",
    # 11. Specialty & Services
    "Subscription meal kit delivery with customer diet preferences and weekly shipments",
    "Digital streaming entertainment service with user subscribers and subscription tiers",
    "Automotive vehicle service center with repair work orders and customer invoices",
]


@pytest.mark.parametrize("prompt_idx, prompt", list(enumerate(GOLDEN_PROMPTS)))
@pytest.mark.asyncio
async def test_t10a_golden_nl_to_ir(prompt_idx: int, prompt: str):
    """T-10a: Validate NL to IR conversion across 30 golden test cases."""
    router = LLMRouter()
    res = await router.call(task="nl_to_ir", payload={"prompt": prompt})

    assert "output" in res, f"Failed output for prompt {prompt_idx}: {prompt}"
    output = res["output"]

    # Must strictly validate against IR Dataset model
    ds = Dataset.model_validate(output)

    assert ds.ir_version == "1.0"
    assert len(ds.name) > 0
    assert len(ds.tables) >= 1, f"No tables generated for prompt: {prompt}"

    # Verify primary key on every table
    for table in ds.tables:
        assert len(table.columns) >= 1
        pk_cols = [c for c in table.columns if c.pk or c.semantic_type == "id"]
        assert len(pk_cols) >= 1, f"Table {table.name} has no primary key for prompt: {prompt}"

    # Verify relationships reference existing tables
    table_names = {t.name for t in ds.tables}
    for rel in ds.relationships:
        assert rel.parent in table_names, f"Unknown parent table {rel.parent}"
        assert rel.child in table_names, f"Unknown child table {rel.child}"

    # Verify locale sensitivity for specific regions
    lower_prompt = prompt.lower()
    if any(k in lower_prompt for k in ["indian", "india", "gst", "inr"]):
        assert ds.locale == "en_IN"
    elif any(k in lower_prompt for k in ["german", "germany", "munich", "berlin"]):
        assert ds.locale == "de_DE"