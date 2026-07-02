"""Synthetic ServiceNow ticket data — 3-month window (April–June 2026)."""

from __future__ import annotations


_GROUP_DEPT: dict[str, str] = {
    "Network Operations":     "IT Operations",
    "Active Directory Team":  "IT Security",
    "SAP Basis Team":         "Finance & HR",
    "Linux Server Team":      "IT Infrastructure",
    "Service Desk":           "Service Delivery",
    "Email/Messaging Team":   "IT Operations",
    "Security Operations":    "IT Security",
    "DBA Team":               "IT Infrastructure",
    "Desktop Support":        "Service Delivery",
    "Unified Communications": "IT Operations",
    "Application Support":    "Application Services",
    "Data Center Ops":        "IT Infrastructure",
}


def _ticket(num, desc, p, state, cat, sub, grp, asn, opened, resolved, close, ci, svc, sla,
            appr=False, appr_ok=False, appr_comment=None, delay=None, dept=None):
    """
    appr          = approval_required (True for access, cert, compliance, major ERP changes)
    appr_ok       = approval_obtained (was approval documented?)
    appr_comment  = approval comment text (None → non-compliant if appr=True)
    delay         = primary reason for SLA breach (Triage/Approval/Execution/Dependency/Escalation/Resource)
    dept          = department; auto-mapped from assignment_group if not supplied
    compliant     = auto-computed: True when no approval needed OR (appr_ok AND comment present)
    """
    compliant = True if not appr else (appr_ok and appr_comment is not None)
    if not appr:
        compliance_reason = None
    elif not appr_ok:
        compliance_reason = "Approval required but not obtained — missing authorisation sign-off"
    elif appr_comment is None:
        compliance_reason = "Approval obtained but no documentation or comment recorded"
    else:
        compliance_reason = None
    return {
        "sys_id": num, "number": num,
        "short_description": desc,
        "description": desc + " — full investigation log attached.",
        "priority": p, "state": state, "category": cat, "subcategory": sub,
        "assignment_group": grp, "assigned_to": asn,
        "department": dept or _GROUP_DEPT.get(grp, "IT Operations"),
        "opened_at": opened, "resolved_at": resolved,
        "close_code": close, "cmdb_ci": ci, "business_service": svc,
        "sla_breached": sla,
        "approval_required": appr,
        "approval_obtained": appr_ok,
        "approval_comment": appr_comment,
        "delay_reason": delay,
        "compliant": compliant,
        "compliance_reason": compliance_reason,
    }


DEMO_TICKETS = [
    # ── April 2026 ────────────────────────────────────────────────────────
    _ticket("INC2604001", "VPN Gateway HA failover event — primary unit unresponsive",
            "1", "Resolved", "Network", "VPN", "Network Operations", "Bob S.",
            "2026-04-02T06:20:00Z", "2026-04-02T07:45:00Z", "Solved (Permanently)",
            "VPN-GW-PRIMARY", "Remote Access", False),

    _ticket("INC2604002", "Active Directory domain controller replication failure",
            "1", "Resolved", "Security", "Active Directory", "Active Directory Team", "Lisa P.",
            "2026-04-05T08:00:00Z", "2026-04-07T11:30:00Z", "Solved (Permanently)",
            "DC-PROD-02", "Identity Management", True,
            appr=True, appr_ok=True,
            appr_comment="CAB approved emergency change CAB-2026-0402 — AD Team lead sign-off on record",
            delay="Approval"),

    _ticket("INC2604003", "SAP Finance module transaction delays exceeding 45 seconds",
            "2", "Resolved", "Application", "ERP", "SAP Basis Team", "Alice M.",
            "2026-04-07T07:30:00Z", "2026-04-08T09:00:00Z", "Solved (Permanently)",
            "SAP-PROD-01", "Finance ERP", False),

    _ticket("INC2604004", "Disk space critical on PROD-APP-04 — 3% free remaining",
            "2", "Resolved", "Infrastructure", "Storage", "Linux Server Team", "Raj K.",
            "2026-04-09T03:15:00Z", "2026-04-10T09:00:00Z", "Solved (Permanently)",
            "PROD-APP-04", "Application Services", False),

    _ticket("INC2604005", "User account locked after repeated failed authentication attempts",
            "3", "Resolved", "Access", "Password Reset", "Service Desk", "Help Desk L1",
            "2026-04-10T09:00:00Z", "2026-04-10T09:20:00Z", "Solved (Permanently)",
            "Active Directory", "Identity Management", False,
            appr=True, appr_ok=True,
            appr_comment="Service Desk L2 approved password reset per identity policy SR-2026-0410"),

    _ticket("INC2604006", "Exchange Online email delivery delays — marketing department",
            "2", "In Progress", "Email", "Exchange", "Email/Messaging Team", "Carol W.",
            "2026-04-12T08:30:00Z", None, None,
            "Exchange Online", "Email Services", True,
            delay="Execution"),

    _ticket("INC2604007", "Core switch port flapping causing intermittent LAN instability",
            "2", "Resolved", "Network", "Switch", "Network Operations", "Bob S.",
            "2026-04-14T14:00:00Z", "2026-04-14T16:30:00Z", "Solved (Permanently)",
            "CORE-SW-01", "LAN Services", False),

    _ticket("INC2604008", "Nightly backup job failure on PROD-DB-01 — insufficient space",
            "2", "Resolved", "Database", "Backup", "DBA Team", "Dave K.",
            "2026-04-16T02:40:00Z", "2026-04-17T10:00:00Z", "Solved (Permanently)",
            "PROD-DB-01", "Database Services", True,
            delay="Triage"),

    _ticket("INC2604009", "SSL certificate expiry warning — customer portal (14 days)",
            "2", "Open", "Security", "Certificate", "Security Operations", None,
            "2026-04-19T07:00:00Z", None, None,
            "Customer Portal Web", "Customer Portal", False,
            appr=True, appr_ok=False),

    _ticket("INC2604010", "Multiple printers offline — Building C third floor cluster",
            "3", "Resolved", "Hardware", "Printer", "Desktop Support", "Tom N.",
            "2026-04-21T09:45:00Z", "2026-04-22T11:00:00Z", "Solved (Permanently)",
            "PRINT-C3-CLUSTER", "Print Services", False),

    _ticket("INC2604011", "Cisco core router BGP misconfiguration — partial route loss",
            "1", "Resolved", "Network", "Router", "Network Operations", "Bob S.",
            "2026-04-24T11:15:00Z", "2026-04-24T13:00:00Z", "Solved (Permanently)",
            "CORE-RTR-01", "WAN Connectivity", False),

    _ticket("INC2604012", "Microsoft Teams audio quality degradation in conference rooms",
            "3", "Open", "Collaboration", "Teams", "Unified Communications", None,
            "2026-04-28T10:00:00Z", None, None,
            "Teams Infrastructure", "Collaboration Services", False),

    # ── May 2026 ─────────────────────────────────────────────────────────
    _ticket("INC2605001", "Production database server filesystem 100% full — service impact",
            "1", "Resolved", "Database", "Storage", "DBA Team", "Dave K.",
            "2026-05-02T01:30:00Z", "2026-05-02T03:45:00Z", "Solved (Permanently)",
            "PROD-DB-02", "Database Services", False),

    _ticket("INC2605002", "Antivirus definition update failure across 180 manufacturing endpoints",
            "2", "Resolved", "Security", "Antivirus", "Security Operations", "Emma J.",
            "2026-05-04T09:00:00Z", "2026-05-05T14:00:00Z", "Solved (Permanently)",
            "Endpoint Security Platform", "Endpoint Security", True,
            delay="Dependency"),

    _ticket("INC2605003", "SAP BASIS upgrade failure — ERP rollback required across Finance/HR",
            "1", "Resolved", "Application", "ERP", "SAP Basis Team", "Alice M.",
            "2026-05-07T06:00:00Z", "2026-05-09T18:00:00Z", "Solved (Permanently)",
            "SAP-PROD-01", "Finance ERP", True,
            appr=True, appr_ok=True,
            appr_comment="CAB approved SAP BASIS upgrade window CAB-2026-0507 — CTO sign-off on file",
            delay="Execution"),

    _ticket("INC2605004", "File server permissions misconfiguration — Sales team data exposed",
            "2", "Resolved", "Access", "File Permissions", "Active Directory Team", "Lisa P.",
            "2026-05-09T10:15:00Z", "2026-05-09T14:30:00Z", "Solved (Permanently)",
            "FILE-SVR-SALES", "File Services", False,
            appr=True, appr_ok=True,
            appr_comment="Sales data owner approved permissions remediation via REQ2605004-APPR"),

    _ticket("INC2605005", "Suspected DDoS attack on public-facing web servers — traffic spike 40×",
            "1", "Resolved", "Security", "DDoS", "Security Operations", "Emma J.",
            "2026-05-12T14:30:00Z", "2026-05-12T17:00:00Z", "Solved (Permanently)",
            "PUBLIC-WEB-CLUSTER", "External Web Services", False),

    _ticket("INC2605006", "Azure AD Connect LDAP sync failure — 2,400 accounts not synced",
            "2", "Resolved", "Access", "Directory Sync", "Active Directory Team", "Lisa P.",
            "2026-05-13T08:45:00Z", "2026-05-13T12:00:00Z", "Solved (Permanently)",
            "AAD-Connect-01", "Identity Management", False,
            appr=True, appr_ok=True,
            appr_comment="IAM team lead approved directory sync remediation — IAM-APPR-2026-0513"),

    _ticket("INC2605007", "Backup tape rotation overdue — off-site pickup missed for 8 days",
            "2", "Resolved", "Database", "Backup", "DBA Team", "Dave K.",
            "2026-05-14T10:00:00Z", "2026-05-15T11:00:00Z", "Solved (Permanently)",
            "Tape Library TL-01", "Data Protection", False),

    _ticket("INC2605008", "UPS power failure — Server Room A on bypass for 4 hours",
            "1", "Resolved", "Hardware", "Power", "Data Center Ops", "Frank R.",
            "2026-05-17T02:10:00Z", "2026-05-17T06:30:00Z", "Solved (Permanently)",
            "UPS-SRVR-ROOM-A", "Power Infrastructure", False),

    _ticket("INC2605009", "VPN client certificate mass-expiry — 320 remote users disconnected",
            "1", "Resolved", "Security", "Certificate", "Security Operations", "Emma J.",
            "2026-05-19T07:00:00Z", "2026-05-20T10:00:00Z", "Solved (Permanently)",
            "VPN Certificate Authority", "Remote Access", True,
            appr=True, appr_ok=False,
            delay="Approval"),

    _ticket("INC2605010", "CRM application response time degraded — avg 8s for key workflows",
            "2", "Resolved", "Application", "CRM", "Application Support", "Grace L.",
            "2026-05-21T09:00:00Z", "2026-05-22T14:00:00Z", "Solved (Permanently)",
            "CRM-PROD-CLUSTER", "CRM Services", False),

    _ticket("INC2605011", "Intermittent DNS resolution failures — finance and HR segments",
            "2", "Resolved", "Network", "DNS", "Network Operations", "Bob S.",
            "2026-05-23T07:30:00Z", "2026-05-23T10:00:00Z", "Solved (Permanently)",
            "DNS-SVR-PRIMARY", "DNS Services", False),

    _ticket("INC2605012", "SQL Server replication latency exceeding 4 hours on PROD-DB-03",
            "2", "In Progress", "Database", "Replication", "DBA Team", "Dave K.",
            "2026-05-26T16:00:00Z", None, None,
            "PROD-DB-03", "Database Services", False),

    _ticket("INC2605013", "RDP brute-force attack detected — 12,000 failed attempts in 1 hour",
            "1", "Resolved", "Security", "Intrusion Detection", "Security Operations", "Emma J.",
            "2026-05-28T03:45:00Z", "2026-05-28T05:00:00Z", "Solved (Permanently)",
            "RDP-GATEWAY", "Remote Access", False),

    _ticket("INC2605014", "Microsoft Teams calling service outage — PSTN calls failing",
            "2", "Resolved", "Collaboration", "Teams Calling", "Unified Communications", "Sam O.",
            "2026-05-30T08:00:00Z", "2026-05-31T11:30:00Z", "Solved (Permanently)",
            "Teams Direct Routing", "Collaboration Services", True,
            delay="Escalation"),

    # ── June 2026 ─────────────────────────────────────────────────────────
    _ticket("INC2606001", "SSL certificate expired on API gateway — mobile app authentication broken",
            "1", "Resolved", "Security", "Certificate", "Security Operations", "Emma J.",
            "2026-06-02T05:00:00Z", "2026-06-02T07:15:00Z", "Solved (Permanently)",
            "API-GW-PROD", "API Gateway", True,
            appr=True, appr_ok=True,
            appr_comment="Emergency CAB approved cert renewal ECA-2026-0602 — CISO authorised",
            delay="Triage"),

    _ticket("INC2606002", "PROD-WEB-02 sustained CPU utilisation at 95% — response degraded",
            "2", "Resolved", "Infrastructure", "Server", "Linux Server Team", "Raj K.",
            "2026-06-04T11:30:00Z", "2026-06-04T15:00:00Z", "Solved (Permanently)",
            "PROD-WEB-02", "Web Services", False),

    _ticket("INC2606003", "Privileged account access control review — 18 over-provisioned accounts",
            "2", "Open", "Security", "Access Control", "Security Operations", None,
            "2026-06-07T09:00:00Z", None, None,
            "Active Directory", "Identity Management", False,
            appr=True, appr_ok=False),

    _ticket("INC2606004", "Email gateway spam filter malfunction — false positives blocking legit mail",
            "2", "Resolved", "Email", "Spam Filter", "Email/Messaging Team", "Carol W.",
            "2026-06-09T07:45:00Z", "2026-06-10T09:30:00Z", "Solved (Permanently)",
            "Email Gateway", "Email Services", False),

    _ticket("INC2606005", "Patch Tuesday compliance gap — 47 servers missing critical patches",
            "2", "In Progress", "Security", "Patch Management", "Security Operations", "Emma J.",
            "2026-06-11T09:00:00Z", None, None,
            "Patch Management Server", "Endpoint Security", False,
            appr=True, appr_ok=False),

    _ticket("INC2606006", "ERP payment module processing failure — order pipeline blocked",
            "1", "Resolved", "Application", "ERP", "SAP Basis Team", "Alice M.",
            "2026-06-14T10:00:00Z", "2026-06-14T13:30:00Z", "Solved (Permanently)",
            "SAP-PROD-PAYMENT", "Finance ERP", False,
            appr=True, appr_ok=True,
            appr_comment="CTO and Finance Director approved emergency ERP payment fix — verbal + ticket sign-off"),

    _ticket("INC2606007", "Spanning tree loop detected on VLAN 30 — intermittent packet loss",
            "2", "Resolved", "Network", "Switch", "Network Operations", "Bob S.",
            "2026-06-16T08:15:00Z", "2026-06-16T10:00:00Z", "Solved (Permanently)",
            "ACCESS-SW-VLAN30", "LAN Services", False),

    _ticket("INC2606008", "Password policy violation detected — 23 accounts using weak credentials",
            "3", "Open", "Security", "Password Policy", "Security Operations", None,
            "2026-06-19T09:00:00Z", None, None,
            "Active Directory", "Identity Management", False),

    _ticket("INC2606009", "DR backup restore test failure — RTO target of 4 hours not met",
            "2", "Resolved", "Database", "Disaster Recovery", "DBA Team", "Dave K.",
            "2026-06-22T09:00:00Z", "2026-06-24T11:00:00Z", "Solved (Partly)",
            "DR-BACKUP-VAULT", "Data Protection", True,
            appr=True, appr_ok=True,
            appr_comment="DBA team lead approved DR test schedule — DR-APPR-2026-0622",
            delay="Resource"),

    _ticket("INC2606010", "VPN client software rollout causing authentication errors on 65 devices",
            "2", "In Progress", "Network", "VPN", "Network Operations", "Bob S.",
            "2026-06-24T08:00:00Z", None, None,
            "VPN Client Infrastructure", "Remote Access", False,
            appr=True, appr_ok=False),
]


DEMO_ANALYSIS = {
    "summary": (
        "Three-month analysis (April–June 2026) of 36 IT incidents reveals a significant peak in May "
        "with 6 P1 incidents including a DDoS attack, SAP upgrade rollback, mass VPN certificate expiry, "
        "and a UPS failure. Security and Network Operations account for 44% of all incident volume. "
        "SLA breach rate stands at 25% (9 tickets), concentrated in May. June shows improvement with "
        "only 2 SLA breaches, though 4 open items require immediate attention including a Patch Tuesday "
        "compliance gap and ongoing SQL replication latency. Certificate lifecycle management is the "
        "single highest-leverage remediation target, contributing to 3 separate P1 incidents. "
        "RITM compliance rate is 62% (8/13 approval-required tickets fully compliant) with June "
        "showing deterioration — 3 of 6 approval-required tickets are non-compliant."
    ),
    "metrics": {
        "total_tickets": 36,
        "p1_count": 11,
        "p2_count": 21,
        "p3_count": 4,
        "avg_resolution_hours": 4.2,
        "sla_breach_rate": 0.25,
        "open_tickets": 7,
        "resolved_tickets": 29,
    },
    "top_issues": [
        {"issue": "Certificate Lifecycle Failures", "count": 3, "impact": "high"},
        {"issue": "Security Attacks & Intrusions", "count": 3, "impact": "high"},
        {"issue": "Database & Backup Operations", "count": 5, "impact": "medium"},
        {"issue": "Network Infrastructure Instability", "count": 6, "impact": "medium"},
        {"issue": "Application/ERP Outages", "count": 4, "impact": "high"},
        {"issue": "Identity & Access Misconfigurations", "count": 3, "impact": "medium"},
    ],
    "trends": [
        {
            "observation": "May was peak incident month (14 tickets, 6×P1) — SAP upgrade, DDoS, and VPN cert expiry drove critical load",
            "direction": "up",
        },
        {
            "observation": "June P1 count dropped to 2 after Security Operations reinforcement, showing measurable improvement",
            "direction": "down",
        },
        {
            "observation": "Security incidents up 67% month-over-month (Apr: 3 → May: 5 → Jun: 5) — sustained threat pressure",
            "direction": "up",
        },
        {
            "observation": "DBA Team carrying growing backlog — 3 open/in-progress database tickets spanning 6+ weeks",
            "direction": "up",
        },
        {
            "observation": "Average resolution time improved from 5.1h (May) to 3.4h (June) as runbook automation deployed",
            "direction": "down",
        },
        {
            "observation": "RITM compliance deteriorating in June — 3 of 6 approval-required tickets have no documented approval",
            "direction": "up",
        },
    ],
    "recommendations": [
        {
            "action": "Implement automated certificate lifecycle management (ACME/Let's Encrypt or CMP) with 30-day pre-expiry alerting — 3 P1s were certificate-related",
            "priority": "high",
            "effort": "medium",
        },
        {
            "action": "Deploy centralised patch compliance dashboard and enforce 14-day patching SLA — 47 servers currently non-compliant",
            "priority": "high",
            "effort": "low",
        },
        {
            "action": "Conduct privileged access review and implement PAM solution — 18 over-provisioned accounts identified",
            "priority": "high",
            "effort": "medium",
        },
        {
            "action": "Enforce approval documentation policy: 5 tickets closed without required approval comments — mandate SNOW workflow gates",
            "priority": "high",
            "effort": "low",
        },
        {
            "action": "Automate disk-capacity alerting at 80% threshold on all production servers to prevent backup failures",
            "priority": "medium",
            "effort": "low",
        },
        {
            "action": "Establish DR restore test schedule (quarterly) and update RTO targets to match current infrastructure capability",
            "priority": "medium",
            "effort": "high",
        },
    ],
    "ritm_summary": {
        "total_requiring_approval": 13,
        "compliant": 8,
        "non_compliant": 5,
        "compliance_rate": 0.615,
        "non_compliant_tickets": [
            "INC2604009", "INC2605009", "INC2606003", "INC2606005", "INC2606010",
        ],
        "detail": (
            "5 tickets were closed or remain open without mandatory approval documentation. "
            "INC2604009 (SSL cert renewal), INC2605009 (VPN cert mass-expiry), INC2606003 (privileged "
            "access review), INC2606005 (patch deployment), and INC2606010 (VPN rollout) all required "
            "CAB or data-owner approval but no comment was recorded. This constitutes a compliance breach "
            "under the Change Management Policy v3.2."
        ),
    },
    "spike_analysis": [
        {
            "period": "Apr W2",
            "date_range": "Apr 8–14, 2026",
            "incidents": 4,
            "baseline": 3,
            "direction": "up",
            "pct_above_baseline": 33,
            "area": "Infrastructure, Network, Email",
            "root_cause": "Disk space exhaustion on PROD-APP-04 converged with core switch port flapping — two independent infrastructure failures in the same week amplified by an Exchange delivery delay carrying over from the prior week.",
            "tickets": ["INC2604003", "INC2604004", "INC2604006", "INC2604007"],
        },
        {
            "period": "May W2",
            "date_range": "May 11–17, 2026",
            "incidents": 4,
            "baseline": 3,
            "direction": "up",
            "pct_above_baseline": 33,
            "area": "Security, Infrastructure",
            "root_cause": "Concurrent DDoS attack on public web cluster (P1) and UPS bypass in Server Room A (P1) — two unrelated high-severity events in the same week, both requiring immediate all-hands response. Azure AD sync failure occurred same day as DDoS, likely due to infrastructure instability.",
            "tickets": ["INC2605005", "INC2605006", "INC2605007", "INC2605008"],
        },
        {
            "period": "May W4",
            "date_range": "May 26–31, 2026",
            "incidents": 4,
            "baseline": 3,
            "direction": "up",
            "pct_above_baseline": 33,
            "area": "Security, Database, Collaboration",
            "root_cause": "Sustained security pressure: RDP brute-force attack (P1) overlapped with Teams PSTN outage and SQL replication lag entering its second week. Security Operations team was already stretched from the May W2 events — escalation delays contributed to the PSTN SLA breach.",
            "tickets": ["INC2605012", "INC2605013", "INC2605014"],
        },
        {
            "period": "Jun W3–W4",
            "date_range": "Jun 15–28, 2026",
            "incidents": 2,
            "baseline": 3,
            "direction": "down",
            "pct_above_baseline": -33,
            "area": "All",
            "root_cause": "Positive signal — incident volume dropped 33% below baseline in the final two weeks of June following Security Operations team reinforcement (+2 FTE) and deployment of automated runbook scripts for certificate and patch management. Resolution time also improved to 3.4h average.",
            "tickets": ["INC2606008", "INC2606009"],
        },
    ],
}


DEMO_CHART_SPECS = [
    {
        "id": "monthly_trend",
        "type": "line",
        "title": "Incident Volume — Monthly Trend",
        "subtitle": "April – June 2026  (total vs P1 critical)",
        "x_key": "month",
        "y_keys": ["total", "p1"],
        "data": [
            {"month": "Apr 2026", "total": 12, "p1": 3},
            {"month": "May 2026", "total": 14, "p1": 6},
            {"month": "Jun 2026", "total": 10, "p1": 2},
        ],
        "config": {"colors": ["#579DFF", "#F87462"]},
    },
    {
        "id": "weekly_volume",
        "type": "area",
        "title": "Weekly Incident Volume",
        "subtitle": "Rolling 12-week view  ·  baseline avg 3/week",
        "x_key": "week",
        "y_keys": ["incidents"],
        "data": [
            {"week": "Apr W1", "incidents": 2},
            {"week": "Apr W2", "incidents": 4},
            {"week": "Apr W3", "incidents": 3},
            {"week": "Apr W4", "incidents": 3},
            {"week": "May W1", "incidents": 3},
            {"week": "May W2", "incidents": 4},
            {"week": "May W3", "incidents": 3},
            {"week": "May W4", "incidents": 4},
            {"week": "Jun W1", "incidents": 3},
            {"week": "Jun W2", "incidents": 3},
            {"week": "Jun W3", "incidents": 2},
            {"week": "Jun W4", "incidents": 2},
        ],
        "config": {"colors": ["#579DFF"]},
    },
    {
        "id": "priority_dist",
        "type": "bar",
        "title": "Incidents by Priority",
        "subtitle": "3-month aggregate",
        "x_key": "priority",
        "y_keys": ["count"],
        "data": [
            {"priority": "P1 Critical", "count": 11},
            {"priority": "P2 High",     "count": 21},
            {"priority": "P3 Medium",   "count": 4},
        ],
        "config": {"colors": ["#F87462", "#E2B203", "#579DFF"]},
    },
    {
        "id": "category_dist",
        "type": "pie",
        "title": "Incidents by Category",
        "subtitle": "Service domain breakdown",
        "x_key": "category",
        "y_keys": ["count"],
        "data": [
            {"category": "Security",        "count": 10},
            {"category": "Network",         "count": 6},
            {"category": "Database",        "count": 5},
            {"category": "Application",     "count": 4},
            {"category": "Access",          "count": 3},
            {"category": "Infrastructure",  "count": 2},
            {"category": "Email",           "count": 2},
            {"category": "Hardware",        "count": 2},
            {"category": "Collaboration",   "count": 2},
        ],
        "config": {"colors": ["#F87462", "#579DFF", "#E2B203", "#22A06B", "#8F7EE7", "#2ABFBF", "#85B8FF", "#FD9891", "#7EE2B8"]},
    },
    {
        "id": "sla_by_month",
        "type": "bar",
        "title": "SLA Breach Count by Month",
        "subtitle": "Target: 0 breaches",
        "x_key": "month",
        "y_keys": ["breaches"],
        "data": [
            {"month": "Apr 2026", "breaches": 3},
            {"month": "May 2026", "breaches": 4},
            {"month": "Jun 2026", "breaches": 2},
        ],
        "config": {"colors": ["#F87462"]},
    },
    {
        "id": "group_workload",
        "type": "bar",
        "title": "Top Assignment Groups by Volume",
        "subtitle": "All incidents — 3-month period",
        "x_key": "group",
        "y_keys": ["count"],
        "data": [
            {"group": "Security Ops",   "count": 9},
            {"group": "Network Ops",    "count": 7},
            {"group": "DBA Team",       "count": 5},
            {"group": "AD Team",        "count": 3},
            {"group": "SAP Basis",      "count": 3},
        ],
        "config": {"colors": ["#579DFF"]},
    },
    {
        "id": "approval_required",
        "type": "pie",
        "title": "Tickets by Approval Requirement",
        "subtitle": "36 tickets total — 13 require CAB / data-owner approval",
        "x_key": "category",
        "y_keys": ["count"],
        "data": [
            {"category": "Approval Required",  "count": 13},
            {"category": "No Approval Needed", "count": 23},
        ],
        "config": {"colors": ["#8F7EE7", "#579DFF"]},
    },
    {
        "id": "delay_reasons",
        "type": "bar",
        "title": "SLA Breach — Root Cause by Delay Stage",
        "subtitle": "9 SLA-breached tickets  ·  primary delay phase",
        "x_key": "reason",
        "y_keys": ["count"],
        "data": [
            {"reason": "Triage",     "count": 2},
            {"reason": "Approval",   "count": 2},
            {"reason": "Execution",  "count": 2},
            {"reason": "Escalation", "count": 1},
            {"reason": "Resource",   "count": 1},
            {"reason": "Dependency", "count": 1},
        ],
        "config": {"colors": ["#F87462", "#E2B203", "#579DFF", "#22A06B", "#8F7EE7", "#2ABFBF"]},
    },
    {
        "id": "ritm_compliance",
        "type": "bar",
        "title": "RITM Compliance by Month",
        "subtitle": "Compliant vs non-compliant among approval-required tickets",
        "x_key": "month",
        "y_keys": ["compliant", "non_compliant"],
        "data": [
            {"month": "Apr 2026", "compliant": 2, "non_compliant": 1},
            {"month": "May 2026", "compliant": 3, "non_compliant": 1},
            {"month": "Jun 2026", "compliant": 3, "non_compliant": 3},
        ],
        "config": {"colors": ["#22A06B", "#F87462"]},
    },
    {
        "id": "application_dist",
        "type": "pie",
        "title": "Tickets by Application / Service",
        "subtitle": "Business service distribution — 36 tickets",
        "x_key": "application",
        "y_keys": ["count"],
        "data": [
            {"application": "Identity Management",  "count": 7},
            {"application": "Remote Access",         "count": 5},
            {"application": "Database Services",     "count": 5},
            {"application": "Finance ERP",           "count": 4},
            {"application": "Email Services",        "count": 3},
            {"application": "Endpoint Security",     "count": 3},
            {"application": "Collaboration Svcs",    "count": 2},
            {"application": "LAN Services",          "count": 2},
            {"application": "Other",                 "count": 5},
        ],
        "config": {"colors": ["#0c66e4","#2898bd","#22a06b","#e2b203","#e2483d","#8270db","#da62ac","#4cae4f","#758195"]},
    },
    {
        "id": "department_dist",
        "type": "bar",
        "title": "Tickets by Department",
        "subtitle": "Incident ownership by department — 3-month period",
        "x_key": "department",
        "y_keys": ["count"],
        "data": [
            {"department": "IT Security",         "count": 10},
            {"department": "IT Operations",        "count": 9},
            {"department": "IT Infrastructure",    "count": 7},
            {"department": "Application Services", "count": 4},
            {"department": "Finance & HR",         "count": 4},
            {"department": "Service Delivery",     "count": 2},
        ],
        "config": {"colors": ["#0c66e4"]},
    },
    {
        "id": "spike_analysis",
        "type": "bar",
        "title": "Spike Detection — Weekly vs Baseline",
        "subtitle": "Baseline: 3 incidents/week  ·  spikes: Apr W2, May W2, May W4",
        "x_key": "week",
        "y_keys": ["incidents", "baseline"],
        "data": [
            {"week": "Apr W1", "incidents": 2,  "baseline": 3},
            {"week": "Apr W2", "incidents": 4,  "baseline": 3},
            {"week": "Apr W3", "incidents": 3,  "baseline": 3},
            {"week": "Apr W4", "incidents": 3,  "baseline": 3},
            {"week": "May W1", "incidents": 3,  "baseline": 3},
            {"week": "May W2", "incidents": 4,  "baseline": 3},
            {"week": "May W3", "incidents": 3,  "baseline": 3},
            {"week": "May W4", "incidents": 4,  "baseline": 3},
            {"week": "Jun W1", "incidents": 3,  "baseline": 3},
            {"week": "Jun W2", "incidents": 3,  "baseline": 3},
            {"week": "Jun W3", "incidents": 2,  "baseline": 3},
            {"week": "Jun W4", "incidents": 2,  "baseline": 3},
        ],
        "config": {"colors": ["#579DFF", "#DFE1E6"]},
    },
]
