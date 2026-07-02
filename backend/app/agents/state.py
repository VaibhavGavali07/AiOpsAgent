import operator
from typing import Annotated

from typing_extensions import TypedDict


class OpsIntelState(TypedDict):
    run_id: str
    objective: str
    filters: dict

    # CEO initial pass
    ceo_initial_plan: str

    # ServiceNow data
    raw_tickets: list
    sanitized_tickets: list

    # Security gate results
    security_pre_passed: bool
    security_pre_reason: str
    security_data_passed: bool
    security_data_reason: str
    security_output_passed: bool
    security_output_reason: str

    # Analysis + visualization outputs
    analysis_result: dict
    chart_specs: list

    # Security flags accumulate across all security nodes
    security_flags: Annotated[list, operator.add]

    # Final outputs
    final_summary: str
    ceo_approved: bool
    retry_count: int

    error: str
    status: str

    # User-defined rules loaded from DB before graph run (optional)
    approval_rules: list
    compliance_rules: list
