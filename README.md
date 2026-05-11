
🎓 CONNECT_ALUMNI — Alumni Networking Platform

A full-stack alumni networking platform that enables users to connect based on shared educational background and workplace experience.

Built with a modern PERN-style architecture (PostgreSQL, Express, React, Node.js).

🚀 Live Overview

This platform allows users to:

Register and login securely
Build detailed alumni profiles
Connect with people from the same schools or workplaces
Chat with other users
Create posts, like, and comment
Search alumni by institution or company
Manage privacy of personal data
🧩 Tech Stack
Frontend
React (TypeScript)
Vite
Axios / Fetch API
Backend
Node.js
Express.js
TypeScript
JWT Authentication
bcrypt password hashing
Database
PostgreSQL
Relational schema (users, posts, messages, connections)
Deployment
Frontend: Vercel
Backend: Render
Database: Render PostgreSQL
🔐 Authentication System
Email + password registration
Secure login using JWT
Password hashing using bcrypt
Token-based session authentication
👤 User Features

Each user profile includes:

Education
Primary School
High School
University / College
Professional
Current job
Past job history
Work experience description
Media
Public profile picture
Optional additional images
Privacy Controls

Users can control visibility of:

Email (public/private)
Phone number (public/private)
Images (public/private except profile picture)

Sensitive data is protected at backend level, not just UI.

🔎 Alumni Matching System

The system automatically suggests connections based on:

Same primary school
Same high school
Same university/college
Same workplace

Includes:

“People You May Know” feature
Smart user recommendations
🔍 Search System

Users can search for alumni by:

School name
Workplace name

Search results:

Return only registered users
Respect privacy settings
Filter based on access rules
💬 Messaging System
One-to-one chat system
Real-time or near real-time communication
Stored message history
Timestamps for messages
📝 Social Features

Users can:

Create posts
Like posts
Comment on posts
🛡️ Security Implementation
Password hashing (bcrypt)
JWT authentication
Input validation (Zod)
SQL injection protection (parameterized queries)
XSS protection (Helmet)
CORS restrictions
Role-based access control (Admin vs Users)
🧑‍💼 Admin Panel

Admin capabilities:

View all users
Access all data (including private fields)
Moderate posts
Manage platform activity
Monitor system usage
🗄️ Database Schema (Overview)

Main tables:

users
profiles
posts
comments
likes
messages
connections

(Relational PostgreSQL design)

🏗️ System Architecture
Frontend (React + Vite)
        ↓
Backend API (Express + Node.js)
        ↓
Authentication (JWT)
        ↓
Database (PostgreSQL)

👨‍💻 Author

Built as a full-stack engineering project focused on real-world alumni networking systems, authentication, and scalable backend architecture. 
