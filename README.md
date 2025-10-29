# DomainSeller Backend

A Node.js backend application for domain selling platform, connected to Neon PostgreSQL database.

## Features

- ✅ Express.js REST API
- ✅ Neon PostgreSQL database integration
- ✅ CRUD operations for domains and users
- ✅ Security middleware (Helmet, CORS)
- ✅ Request logging with Morgan
- ✅ Environment variable configuration
- ✅ Error handling middleware
- ✅ Health check endpoint

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Neon Account** - Sign up at [neon.tech](https://neon.tech) if you don't have one

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp ENV_TEMPLATE.txt .env
```

Edit the `.env` file with your actual values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://username:password@your-neon-hostname.neon.tech/database_name?sslmode=require
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Get your Neon connection string:**
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click "Connection Details"
4. Copy the connection string

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT)

## API Endpoints

### Health Check
- `GET /health` - Check if server is running

### API Info
- `GET /api` - Get API information and available endpoints

### Domains
- `GET /api/domains` - Get all domains
- `GET /api/domains/:id` - Get domain by ID
- `POST /api/domains` - Create new domain
- `PUT /api/domains/:id` - Update domain
- `DELETE /api/domains/:id` - Delete domain

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## API Examples

### Create a Domain
```bash
curl -X POST http://localhost:3000/api/domains \
  -H "Content-Type: application/json" \
  -d '{
    "name": "example.com",
    "price": 10000,
    "description": "Premium domain name",
    "category": "Technology"
  }'
```

### Get All Domains
```bash
curl http://localhost:3000/api/domains
```

### Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "secure_password"
  }'
```

## Project Structure

```
DomainSeller-Backend/
├── config/
│   └── database.js          # Neon database configuration
├── routes/
│   ├── index.js             # Main router
│   ├── domains.js           # Domain routes
│   └── users.js             # User routes
├── server.js                # Express server setup
├── package.json             # Project dependencies
├── .gitignore              # Git ignore rules
├── ENV_TEMPLATE.txt        # Environment template
└── README.md               # This file
```

## Security Notes

⚠️ **Important for Production:**

1. **Password Hashing**: The current implementation stores passwords in plain text. Use `bcrypt` or `argon2` to hash passwords before storing.
2. **Authentication**: Implement JWT or session-based authentication.
3. **Input Validation**: Add validation middleware (e.g., `express-validator`).
4. **Rate Limiting**: Add rate limiting to prevent abuse.
5. **Environment Variables**: Never commit `.env` file to version control.

## Dependencies

- **express** - Web framework
- **@neondatabase/serverless** - Neon database client
- **dotenv** - Environment variable management
- **cors** - Cross-Origin Resource Sharing
- **helmet** - Security headers
- **morgan** - HTTP request logger
- **nodemon** - Development auto-reload (dev dependency)

## Troubleshooting

### Database Connection Issues

1. **Check connection string**: Ensure your `DATABASE_URL` in `.env` is correct
2. **Test connection**: The server automatically tests the connection on startup
3. **Neon console**: Verify your database is active in Neon Console

### Port Already in Use

If port 3000 is already in use, change the `PORT` in your `.env` file:
```env
PORT=3001
```

## License

ISC

## Support

For issues and questions:
- Check [Neon Documentation](https://neon.tech/docs)
- Check [Express Documentation](https://expressjs.com)

---

Made with ❤️ for DomainSeller