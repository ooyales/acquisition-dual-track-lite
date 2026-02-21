from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and get a JWT token.
    ---
    tags:
      - Auth
    security: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - email
            - password
          properties:
            email:
              type: string
              example: admin@acq.local
            password:
              type: string
              example: demo123
    responses:
      200:
        description: Login successful
        schema:
          type: object
          properties:
            access_token:
              type: string
              description: JWT access token
            user:
              $ref: '#/definitions/User'
      400:
        description: Missing credentials
      401:
        description: Invalid credentials
      403:
        description: Account disabled
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is disabled'}), 403

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            'role': user.role,
            'email': user.email,
            'name': user.name,
            'team': user.team,
        }
    )

    return jsonify({
        'access_token': access_token,
        'user': user.to_dict(),
    })


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Get current authenticated user profile.
    ---
    tags:
      - Auth
    responses:
      200:
        description: Current user profile
        schema:
          $ref: '#/definitions/User'
      404:
        description: User not found
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())
