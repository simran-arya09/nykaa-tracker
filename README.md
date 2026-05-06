# Nykaa Tracker

A full-stack application for tracking and managing Nykaa products, prices, and inventory.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Database](#database)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- Track Nykaa products and their details
- Monitor price changes over time
- Real-time database updates
- Responsive frontend interface
- RESTful API backend

## 🛠 Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: React (or your framework)
- **Database**: SQLite (tracker.db)
- **Package Manager**: npm

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nykaa-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   node server.js
   ```

4. **Access the application**
   - Backend runs on: `http://localhost:3000` (or your configured port)
   - Frontend: Open the frontend folder or navigate to the frontend URL

## 🚀 Usage

### Starting the Application

```bash
npm start
```

### API Endpoints

- `GET /api/products` - Get all tracked products
- `POST /api/products` - Add a new product
- `PUT /api/products/:id` - Update product details
- `DELETE /api/products/:id` - Delete a product

## 📁 Project Structure

```
nykaa-tracker/
├── frontend/              # React/Vue/Angular frontend
├── server.js             # Express server entry point
├── tracker.db            # SQLite database
├── package.json          # Project dependencies
├── package-lock.json     # Locked dependency versions
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 💾 Database

The project uses SQLite with `tracker.db` as the database file. 

### Initialize Database

If needed, create tables:
```bash
sqlite3 tracker.db < schema.sql
```

## 🤝 Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 📧 Contact

For questions or issues, please open an issue on GitHub or contact the maintainer.

---
<img width="1917" height="1079" alt="Screenshot 2026-05-06 174540" src="https://github.com/user-attachments/assets/dd8c2491-26b9-4b39-9cd0-61469a70d288" />

<img width="1915" height="1079" alt="Screenshot 2026-05-06 174645" src="https://github.com/user-attachments/assets/07bc8b30-9b35-47af-96d4-3afdb76391a2" />




**Last Updated**: May 2026
