"""
Claude AI Integration Service — document drafting, compliance review,
conversational chat, and pre-loaded scenarios.
"""

import os

# MRR System Prompt
MRR_SYSTEM_PROMPT = """You are an expert federal acquisition Market Research Report (MRR) assistant.
You help acquisition professionals draft thorough, compliant market research reports per FAR Part 10.

Structure your reports as follows:
1. **Purpose & Scope** — What is being acquired and why market research is needed
2. **Requirement Description** — Detailed description of the requirement
3. **Market Overview** — Current market landscape, trends, NAICS code analysis
4. **Vendor Identification** — Known vendors, capabilities, past performance
5. **Small Business Assessment** — SBA size standards, set-aside potential, 8(a)/HUBZone/SDVOSB/WOSB availability
6. **Contract Vehicle Analysis** — Available GWACs, BPAs, GSA schedules, ESIs
7. **Price Analysis** — Market pricing data, historical pricing, should-cost estimates
8. **Recommended Strategy** — Acquisition approach, competition strategy, contract type
9. **Conclusion** — Summary of findings and recommended path forward

Guidelines:
- Use [TO BE VERIFIED] markers for any claims that need factual verification
- Cite specific FAR references where applicable
- Include NAICS codes and SBA size standards
- Reference SAM.gov data and GSA Advantage where relevant
- Be specific about small business opportunities
- Recommend set-aside type if applicable (Total SB, 8(a), HUBZone, SDVOSB, WOSB)
"""

# J&A System Prompt
JA_SYSTEM_PROMPT = """You are an expert federal acquisition Justification & Approval (J&A) assistant.
You help contracting officers draft compliant J&A documents per FAR Subpart 6.3.

Structure your J&A documents as follows:
1. **Contracting Activity** — Agency name, address, contracting office
2. **Description of Action** — What is being procured, contract type, estimated value
3. **Authority Cited** — Specific FAR 6.302-x authority with full text citation
4. **Demonstration That the Cited Authority Applies** — Detailed justification with facts
5. **Efforts to Ensure Competition** — Market research conducted, sources considered
6. **Actions to Overcome Barriers to Competition** — Plans to increase future competition
7. **KO Determination** — Statement that the anticipated cost is fair and reasonable
8. **Certification** — Required for actions over $900K (FAR 6.304)

FAR 6.302 Authorities:
- 6.302-1: Only One Responsible Source
- 6.302-2: Unusual and Compelling Urgency
- 6.302-3: Industrial Mobilization / Expert Services
- 6.302-4: International Agreement
- 6.302-5: Authorized or Required by Statute
- 6.302-6: National Security
- 6.302-7: Public Interest

Guidelines:
- Mark unverified claims with [TO BE VERIFIED]
- Include specific factual basis for the cited authority
- Reference market research findings
- Address small business considerations
- Include plans to promote future competition
- For amounts over $900K, include the technical and requirements certification language
"""

# Pre-loaded scenarios
SCENARIOS = {
    'mrr': [
        {
            'id': 'mrr_crowdstrike',
            'title': 'CrowdStrike EDR Renewal',
            'description': 'Market Research Report for CrowdStrike Falcon endpoint detection and response (EDR) platform renewal, $800K estimated value.',
            'context': {
                'product': 'CrowdStrike Falcon EDR Platform',
                'estimated_value': 800000,
                'acquisition_type': 'follow_on_sole_source',
                'naics': '511210',
                'current_contract': 'Existing 1-year subscription, 3,500 endpoints',
                'buy_category': 'software_license',
            },
            'prompt': 'Draft a Market Research Report for the renewal of our CrowdStrike Falcon EDR platform. We currently have 3,500 endpoint licenses. The current contract is expiring and we want to continue with CrowdStrike. Estimated value is $800K. Research the EDR market including competitors like SentinelOne, Microsoft Defender for Endpoint, and Carbon Black.',
        },
        {
            'id': 'mrr_cloud_migration',
            'title': 'Cloud Migration Services',
            'description': 'Market Research Report for enterprise cloud migration services to AWS GovCloud, $2.1M estimated value.',
            'context': {
                'product': 'Cloud Migration Professional Services',
                'estimated_value': 2100000,
                'acquisition_type': 'new_competitive',
                'naics': '541512',
                'buy_category': 'service',
            },
            'prompt': 'Draft a Market Research Report for cloud migration services. We need to migrate 47 on-premise applications to AWS GovCloud over 18 months. Services include assessment, architecture design, migration execution, testing, and post-migration support. Estimated value $2.1M. Consider both large and small business providers.',
        },
        {
            'id': 'mrr_network_switches',
            'title': 'Network Switch Replacement',
            'description': 'Market Research Report for Cisco Catalyst network switch replacement across 12 locations, $450K estimated value.',
            'context': {
                'product': 'Cisco Catalyst 9300 Network Switches',
                'estimated_value': 450000,
                'acquisition_type': 'new_competitive',
                'naics': '334290',
                'buy_category': 'product',
            },
            'prompt': 'Draft a Market Research Report for replacing aging network switches across 12 locations. Current infrastructure is Cisco Catalyst 3850 (end of support). Need 120 new access switches and 24 distribution switches. Consider Cisco, Aruba/HPE, Juniper, and other options. Estimated value $450K.',
        },
    ],
    'ja': [
        {
            'id': 'ja_crowdstrike',
            'title': 'CrowdStrike Sole Source (FAR 6.302-1)',
            'description': 'Justification & Approval for sole source CrowdStrike renewal under FAR 6.302-1, $800K.',
            'context': {
                'product': 'CrowdStrike Falcon EDR Platform',
                'estimated_value': 800000,
                'authority': 'FAR 6.302-1',
                'acquisition_type': 'follow_on_sole_source',
            },
            'prompt': 'Draft a Justification & Approval for sole source renewal of CrowdStrike Falcon EDR. Authority: FAR 6.302-1 (Only One Responsible Source). We have 3,500 endpoints, proprietary threat intelligence integration, and trained SOC analysts. Switching costs estimated at $400K+ including retraining and gap coverage. $800K estimated value.',
        },
        {
            'id': 'ja_urgent_bridge',
            'title': 'Urgent Bridge Contract (FAR 6.302-2)',
            'description': 'Justification & Approval for urgent bridge contract under FAR 6.302-2, $450K.',
            'context': {
                'product': 'IT Help Desk Services Bridge',
                'estimated_value': 450000,
                'authority': 'FAR 6.302-2',
                'acquisition_type': 'bridge_extension',
            },
            'prompt': 'Draft a J&A for a 6-month bridge contract for IT help desk services. Authority: FAR 6.302-2 (Unusual and Compelling Urgency). The incumbent contract expires in 30 days, the recompete RFP received only one proposal which was found technically unacceptable, and we need to resolicit. Without bridge, 5,000 users lose Tier 1-3 support. $450K estimated value.',
        },
        {
            'id': 'ja_brand_name',
            'title': 'Brand Name Palo Alto Firewalls',
            'description': 'Justification & Approval for brand name Palo Alto Networks firewall procurement, $380K.',
            'context': {
                'product': 'Palo Alto Networks PA-5400 Series Firewalls',
                'estimated_value': 380000,
                'authority': 'FAR 6.302-1',
                'acquisition_type': 'brand_name_sole_source',
            },
            'prompt': 'Draft a J&A for brand name procurement of Palo Alto Networks PA-5400 series firewalls. Authority: FAR 6.302-1. Our existing perimeter security is 100% Palo Alto with Panorama central management, GlobalProtect VPN, WildFire threat prevention, and custom security policies. Need 6 replacement units for end-of-life PA-3200 series. $380K estimated value.',
        },
    ],
}


def generate_draft(doc_type, request_data, user_message=None):
    """
    Generate an AI draft for a document.

    Args:
        doc_type: 'mrr' or 'ja' or other document type
        request_data: dict of request context
        user_message: optional user instruction

    Returns:
        dict with generated text
    """
    api_key = os.getenv('ANTHROPIC_API_KEY', '')
    estimated_value = request_data.get('estimated_value', 0)

    # Select system prompt
    if doc_type in ('mrr', 'market_research'):
        system = MRR_SYSTEM_PROMPT
    elif doc_type in ('ja', 'ja_brand_name', 'justification'):
        system = JA_SYSTEM_PROMPT
    else:
        system = f"You are an expert federal acquisition assistant helping draft a {doc_type} document. Follow FAR guidelines and use [TO BE VERIFIED] markers for unverified claims."

    # Build context message
    context_parts = []
    if request_data.get('title'):
        context_parts.append(f"Acquisition Title: {request_data['title']}")
    if request_data.get('description'):
        context_parts.append(f"Description: {request_data['description']}")
    if estimated_value:
        context_parts.append(f"Estimated Value: ${estimated_value:,.2f}")
    if request_data.get('derived_acquisition_type'):
        context_parts.append(f"Acquisition Type: {request_data['derived_acquisition_type']}")
    if request_data.get('derived_tier'):
        context_parts.append(f"Tier: {request_data['derived_tier']}")
    if request_data.get('derived_contract_character'):
        context_parts.append(f"Contract Character: {request_data['derived_contract_character']}")
    if request_data.get('existing_contract_vendor'):
        context_parts.append(f"Current Vendor: {request_data['existing_contract_vendor']}")
    if request_data.get('existing_contract_number'):
        context_parts.append(f"Current Contract: {request_data['existing_contract_number']}")

    context = "\n".join(context_parts)
    prompt = f"Context:\n{context}\n\n"
    if user_message:
        prompt += f"User Request: {user_message}"
    else:
        prompt += f"Please draft a complete {doc_type.upper()} document based on the above context."

    # Select model
    model = 'claude-sonnet-4-5-20250929'
    if doc_type in ('ja', 'ja_brand_name', 'justification') and estimated_value > 900000:
        model = 'claude-opus-4-6'

    if not api_key:
        return _simulated_response(doc_type, request_data, user_message)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=system,
            messages=[{'role': 'user', 'content': prompt}],
        )
        text = response.content[0].text if response.content else ''
        return {
            'success': True,
            'text': text,
            'model': model,
            'doc_type': doc_type,
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'text': _simulated_response(doc_type, request_data, user_message)['text'],
            'model': model,
            'fallback': True,
        }


def review_document(doc_type, text, request_data=None):
    """
    AI compliance review of an existing document.

    Args:
        doc_type: document type
        text: document text to review
        request_data: optional request context

    Returns:
        dict with review findings
    """
    api_key = os.getenv('ANTHROPIC_API_KEY', '')

    system = """You are a senior federal acquisition compliance reviewer.
Review the provided document for:
1. FAR compliance issues
2. Missing required sections or elements
3. Unsupported claims or assertions
4. Logical inconsistencies
5. Areas needing additional detail or evidence

Format your review as:
- **Compliance Issues**: List any FAR violations or concerns
- **Missing Elements**: Required sections or content not present
- **Unsupported Claims**: Assertions lacking evidence
- **Recommendations**: Specific improvements needed
- **Overall Assessment**: Brief summary (Compliant / Minor Issues / Significant Issues / Non-Compliant)
"""

    prompt = f"Document Type: {doc_type}\n\n"
    if request_data:
        if request_data.get('estimated_value'):
            prompt += f"Estimated Value: ${request_data['estimated_value']:,.2f}\n"
        if request_data.get('derived_acquisition_type'):
            prompt += f"Acquisition Type: {request_data['derived_acquisition_type']}\n"
    prompt += f"\nDocument Text:\n{text}\n\nPlease provide a thorough compliance review."

    model = 'claude-opus-4-6'

    if not api_key:
        return _simulated_review(doc_type)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            system=system,
            messages=[{'role': 'user', 'content': prompt}],
        )
        text_result = response.content[0].text if response.content else ''
        return {
            'success': True,
            'review': text_result,
            'model': model,
        }
    except Exception as e:
        result = _simulated_review(doc_type)
        result['error'] = str(e)
        result['fallback'] = True
        return result


def chat(messages, mode='general'):
    """
    Conversational AI chat for acquisition guidance.

    Args:
        messages: list of message dicts [{'role': 'user'|'assistant', 'content': str}]
        mode: 'general' | 'mrr' | 'ja'

    Returns:
        dict with response
    """
    api_key = os.getenv('ANTHROPIC_API_KEY', '')

    if mode == 'mrr':
        system = MRR_SYSTEM_PROMPT + "\n\nYou are in conversational mode. Help the user refine their market research. Ask clarifying questions when needed."
    elif mode == 'ja':
        system = JA_SYSTEM_PROMPT + "\n\nYou are in conversational mode. Help the user develop their justification. Ask clarifying questions when needed."
    else:
        system = """You are an expert federal acquisition advisor. Help users with acquisition strategy,
FAR compliance, document preparation, and procurement best practices. Be specific, cite FAR references,
and provide actionable guidance. Ask clarifying questions when the user's situation is unclear."""

    model = 'claude-sonnet-4-5-20250929'

    if not api_key:
        return {
            'success': True,
            'response': '[AI Demo Mode] I would be happy to help with your acquisition question. In production with an API key configured, I can provide detailed FAR-compliant guidance, help draft documents, and answer specific procurement questions. What would you like to know?',
            'model': 'demo',
        }

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            system=system,
            messages=messages,
        )
        text = response.content[0].text if response.content else ''
        return {
            'success': True,
            'response': text,
            'model': model,
        }
    except Exception as e:
        return {
            'success': False,
            'response': f'[AI Error] {str(e)}. Please check your ANTHROPIC_API_KEY configuration.',
            'model': model,
            'error': str(e),
        }


def get_scenarios():
    """Return pre-loaded scenarios for MRR and J&A."""
    return SCENARIOS


def _simulated_response(doc_type, request_data, user_message=None):
    """Generate a simulated response when no API key is available."""
    title = request_data.get('title', 'Acquisition')
    value = request_data.get('estimated_value', 0)
    acq_type = request_data.get('derived_acquisition_type', 'new_competitive')

    if doc_type in ('mrr', 'market_research'):
        text = f"""# Market Research Report
## {title}

**[AI DEMO MODE — Configure ANTHROPIC_API_KEY for full AI-generated content]**

### 1. Purpose & Scope
This Market Research Report documents the findings of market research conducted in accordance with FAR Part 10 for the acquisition of {title}. The estimated value is ${value:,.2f}.

### 2. Requirement Description
[TO BE VERIFIED] The agency requires {title} to support mission operations. This acquisition is classified as a {acq_type.replace('_', ' ')} procurement.

### 3. Market Overview
The market for this requirement includes multiple potential sources. [TO BE VERIFIED] Current market trends indicate competitive pricing and robust vendor availability.

### 4. Vendor Identification
Multiple vendors were identified through SAM.gov research, GSA Advantage searches, and industry engagement. [TO BE VERIFIED] At least 3 qualified sources exist in the marketplace.

### 5. Small Business Assessment
[TO BE VERIFIED] The applicable NAICS code and SBA size standard should be verified. Small business set-aside potential should be evaluated based on the Rule of Two.

### 6. Contract Vehicle Analysis
Available contract vehicles should be evaluated including GSA Schedule, NASA SEWP, NIH CIO-SP3, and agency-specific BPAs.

### 7. Price Analysis
Based on market research, the estimated value of ${value:,.2f} appears [TO BE VERIFIED] reasonable and consistent with market pricing.

### 8. Recommended Strategy
Based on market research findings, a {acq_type.replace('_', ' ')} approach is recommended.

### 9. Conclusion
Market research supports proceeding with the recommended acquisition strategy.

---
*This is a demo-generated template. Configure ANTHROPIC_API_KEY for full AI-powered drafting.*
"""
    elif doc_type in ('ja', 'ja_brand_name', 'justification'):
        text = f"""# Justification & Approval
## {title}

**[AI DEMO MODE — Configure ANTHROPIC_API_KEY for full AI-generated content]**

### 1. Contracting Activity
[Agency Name], [Address]

### 2. Description of Action
Procurement of {title} with an estimated value of ${value:,.2f}. This action is a {acq_type.replace('_', ' ')} procurement.

### 3. Authority Cited
[TO BE VERIFIED] FAR 6.302-1 — Only One Responsible Source (or as applicable)

### 4. Demonstration That the Cited Authority Applies
[TO BE VERIFIED] The cited authority applies because the required supplies/services are available from only one responsible source and no other type of supplies/services will satisfy agency requirements.

### 5. Efforts to Ensure Competition
Market research was conducted including SAM.gov searches and industry engagement. [TO BE VERIFIED] Despite these efforts, competition was not practicable.

### 6. Actions to Overcome Barriers to Competition
The agency will take the following actions to promote competition for future acquisitions: [TO BE VERIFIED] conduct additional market research, develop specifications that are not brand-specific, and plan competitive follow-on acquisitions.

### 7. KO Determination
The anticipated cost/price is determined to be fair and reasonable based on [TO BE VERIFIED] price analysis methodology.

### 8. Certification
{"Required for actions over $900K per FAR 6.304." if value > 900000 else "Not required for actions at or below $900K."}

---
*This is a demo-generated template. Configure ANTHROPIC_API_KEY for full AI-powered drafting.*
"""
    else:
        text = f"""# {doc_type.replace('_', ' ').title()}
## {title}

**[AI DEMO MODE — Configure ANTHROPIC_API_KEY for full AI-generated content]**

This document template for {doc_type.replace('_', ' ')} has been generated as a starting point.
Estimated value: ${value:,.2f}
Acquisition type: {acq_type.replace('_', ' ')}

Please configure ANTHROPIC_API_KEY for full AI-powered document drafting.

[TO BE COMPLETED]
"""

    return {
        'success': True,
        'text': text,
        'model': 'demo',
        'simulated': True,
    }


def _simulated_review(doc_type):
    """Generate a simulated review response."""
    return {
        'success': True,
        'review': f"""## Compliance Review — {doc_type.replace('_', ' ').title()}

**[AI DEMO MODE — Configure ANTHROPIC_API_KEY for full AI-powered review]**

### Compliance Issues
- Unable to perform automated compliance check in demo mode

### Missing Elements
- Review requires API key for detailed analysis

### Unsupported Claims
- Manual review recommended

### Recommendations
- Configure ANTHROPIC_API_KEY for automated compliance review
- Have a senior acquisition professional review the document
- Cross-reference all FAR citations

### Overall Assessment
**Manual Review Required** — Configure API key for automated assessment.
""",
        'model': 'demo',
        'simulated': True,
    }
