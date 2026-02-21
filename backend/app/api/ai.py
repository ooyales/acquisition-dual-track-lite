from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.ai_service import generate_draft, review_document, chat, get_scenarios

ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/draft', methods=['POST'])
@jwt_required()
def draft():
    """Generate an AI draft document (Market Research, J&A, etc.).
    ---
    tags:
      - AI Assistant
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            doc_type:
              type: string
              default: mrr
              description: Document type (mrr, ja, acquisition_strategy, igce, qasp, etc.)
            request_data:
              type: object
              description: Acquisition request context data
            message:
              type: string
              description: Custom prompt or instructions
    responses:
      200:
        description: AI-generated draft
        schema:
          type: object
          properties:
            success:
              type: boolean
            text:
              type: string
      400:
        description: No data provided
    """
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
    """AI compliance review of a document.
    ---
    tags:
      - AI Assistant
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - text
          properties:
            doc_type:
              type: string
              description: Type of document being reviewed
            text:
              type: string
              description: Document text to review
            request_data:
              type: object
              description: Acquisition request context
    responses:
      200:
        description: Compliance review results
        schema:
          type: object
          properties:
            success:
              type: boolean
            issues:
              type: array
              items:
                type: object
            score:
              type: integer
      400:
        description: Missing required text
    """
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
    """Conversational AI chat for acquisition guidance.
    ---
    tags:
      - AI Assistant
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - messages
          properties:
            messages:
              type: array
              items:
                type: object
                properties:
                  role:
                    type: string
                    enum: [user, assistant]
                  content:
                    type: string
              description: Conversation history
            mode:
              type: string
              default: general
              description: Chat mode (general, mrr, ja)
    responses:
      200:
        description: AI chat response
        schema:
          type: object
          properties:
            success:
              type: boolean
            response:
              type: string
      400:
        description: Missing messages
    """
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
    """Get pre-loaded scenarios for MRR and J&A generation.
    ---
    tags:
      - AI Assistant
    responses:
      200:
        description: List of available scenarios
        schema:
          type: object
          properties:
            mrr_scenarios:
              type: array
              items:
                type: object
            ja_scenarios:
              type: array
              items:
                type: object
    """
    return jsonify(get_scenarios())
