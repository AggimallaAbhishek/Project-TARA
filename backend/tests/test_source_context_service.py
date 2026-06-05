from app.services.source_context_service import build_source_context, build_structured_context, chunk_text, summarize_chunks


def test_build_structured_context_extracts_core_fields():
    text = """
    Components:
    - Browser
    - API Gateway

    Data Flows:
    - Browser -> API Gateway

    Trust Boundaries:
    - Public Internet to Private API

    External Systems:
    - Stripe

    Assets:
    - Payment token
    """

    context = build_structured_context(text)

    assert "Browser" in context["components"]
    assert "Browser -> API Gateway" in context["data_flows"]
    assert "Public Internet to Private API" in context["trust_boundaries"]
    assert "Stripe" in context["external_entities"]
    assert "Payment token" in context["assets"]


def test_chunked_summary_keeps_long_document_bounded():
    text = "\n\n".join(f"Section {index}: API Gateway sends token to Database and Queue." for index in range(80))

    chunks = chunk_text(text, chunk_chars=500)
    summary = summarize_chunks(chunks, max_chars=1200)
    source_context = build_source_context(source_type="document_txt", raw_or_extracted_text=text)

    assert len(chunks) > 1
    assert len(summary) <= 1200
    assert source_context["source_type"] == "document_txt"
    assert "structured_context" in source_context
