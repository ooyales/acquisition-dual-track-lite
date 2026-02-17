from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.ai_service import generate_draft, review_document, chat, get_scenarios

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/draft', methods=['POST'])
@jwt_required()
def draft():
    """Generate an AI draft document."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    doc_type = data.get('doc_type', 'mrr')
    request_data = data.get('request_data', {})
    message = data.get('message') or data.get('prompt')

    result = generate_draft(doc_type, request_data, message)
    return jsonify(result)


@ai_bp.route('/review', methods=['POST'])
@jwt_required()
def review():
    """AI compliance review of a document."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    doc_type = data.get('doc_type', '')
    text = data.get('text', '')
    request_data = data.get('request_data', {})

    if not text:
        return jsonify({'error': 'Document text is required'}), 400

    result = review_document(doc_type, text, request_data)
    return jsonify(result)


@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
def ai_chat():
    """Conversational AI chat."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    messages = data.get('messages', [])
    mode = data.get('mode', 'general')

    if not messages:
        return jsonify({'error': 'Messages are required'}), 400

    result = chat(messages, mode)
    return jsonify(result)


@ai_bp.route('/scenarios', methods=['GET'])
@jwt_required()
def scenarios():
    """Get pre-loaded scenarios for MRR and J&A."""
    return jsonify(get_scenarios())
