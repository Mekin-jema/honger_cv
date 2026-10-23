"""LangGraph definition: nodes, edges, and conditional routing."""

from typing import Any, Literal

from langgraph.graph import END, START, StateGraph

from src.pipeline.nodes import (
    check_ocr_node,
    check_ocr_quality_node,
    check_parse_node,
    extract_node,
    ocr_node,
    parse_node,
)
from src.pipeline.state import PipelineState


def route_ocr(state: PipelineState) -> Literal["ocr", "parse"]:
    """Decide whether to run OCR or skip to parsing."""
    if state.get("error"):
        return "parse"

    ocr_preference = state.get("ocr_preference", "auto")

    if ocr_preference == "skip":
        return "parse"

    ocr_chain = state.get("ocr_chain", [])
    if not ocr_chain:
        return "parse"

    if ocr_preference == "force":
        return "ocr"

    # auto: only OCR when algorithmic text is insufficient
    text_quality = state.get("text_quality")
    if text_quality and text_quality.is_sufficient:
        return "parse"

    return "ocr"


def route_parse_result(state: PipelineState) -> Literal["done", "retry", "fail"]:
    """Decide whether parsing succeeded, should retry, or has failed."""
    if state.get("resume_data") is not None:
        return "done"
    if state.get("error"):
        return "fail"
    return "retry"


def build_pipeline() -> Any:
    """Build and compile the resume parsing pipeline graph."""
    graph: StateGraph[PipelineState] = StateGraph(PipelineState)

    graph.add_node("extract", extract_node)
    graph.add_node("check_ocr", check_ocr_node)
    graph.add_node("ocr", ocr_node)
    graph.add_node("check_ocr_quality", check_ocr_quality_node)
    graph.add_node("parse", parse_node)
    graph.add_node("check_parse", check_parse_node)

    graph.add_edge(START, "extract")
    graph.add_edge("extract", "check_ocr")

    graph.add_conditional_edges(
        "check_ocr",
        route_ocr,
        {"ocr": "ocr", "parse": "parse"},
    )

    graph.add_edge("ocr", "check_ocr_quality")
    graph.add_edge("check_ocr_quality", "parse")

    graph.add_edge("parse", "check_parse")

    graph.add_conditional_edges(
        "check_parse",
        route_parse_result,
        {"done": END, "retry": "parse", "fail": END},
    )

    return graph.compile()
