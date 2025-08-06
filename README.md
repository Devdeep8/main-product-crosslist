# Kaneo Clone - Project Management Application

A full-featured project management application similar to Kaneo (demo.kaneo.app) built with Next.js 14, TypeScript, Prisma, MySQL, and shadcn/ui.

## 🚀 Features

- **Authentication System**: JWT-based authentication with role-based access control
- **Workspace Management**: Create, edit, and manage workspaces with team collaboration
- **Project Management**: Comprehensive project tracking with status and priority management
- **Kanban Board**: Drag-and-drop task management with customizable columns
- **Time Tracking**: Manual time entry and built-in timer functionality
- **Collaboration**: Task comments, file attachments, and real-time activity feed
- **Analytics**: Time tracking reports and project analytics
- **Responsive Design**: Mobile-first design with modern UI/UX

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (with Radix UI primitives)
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: MySQL with Prisma ORM
- **Authentication**: Custom JWT-based session management
- **Drag & Drop**: @dnd-kit/core
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- MySQL database
- Yarn package manager

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd prabisha-project-pro
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="mysql://username:password@localhost:3306/kaneo_clone"
NEXTAUTH_SECRET="your-super-secret-jwt-key-here"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. Set up the database

```bash
# Generate Prisma client
yarn db:generate

# Push the schema to your database
yarn db:push

# Seed the database with sample data
yarn db:seed
```

### 5. Start the development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📊 Database Schema

The application uses a comprehensive database schema with the following main entities:

- **Users**: Authentication and user management
- **Workspaces**: Team collaboration spaces
- **Projects**: Project management within workspaces
- **Tasks**: Individual work items with drag-and-drop support
- **Columns**: Kanban board columns for task organization
- **Time Entries**: Time tracking for tasks
- **Comments**: Task collaboration and communication
- **Activity Logs**: Audit trail and activity tracking

## 🔐 Authentication

The application uses JWT-based authentication with HTTP-only cookies for security. Users can:

- Sign up with email and password
- Sign in with existing credentials
- Access role-based features (Admin, Manager, Member)
- Sign out securely

## 🎯 Core Features

### Workspace Management
- Create and manage workspaces
- Invite team members via email
- Role-based permissions (Owner, Admin, Member)
- Workspace settings and configuration

### Project Management
- Create projects within workspaces
- Project status tracking (Active, Completed, Archived)
- Priority levels (Low, Medium, High, Urgent)
- Project deadlines and milestones
- Project member assignment and roles

### Kanban Board System
- Drag-and-drop task management using @dnd-kit
- Customizable columns (To Do, In Progress, Review, Done)
- Real-time task position updates
- Column reordering and customization
- Visual task status indicators

### Task Management
- Create, edit, delete tasks with rich descriptions
- Task assignment to team members
- Priority and status management
- Due dates and time estimates
- Task comments and discussions
- File attachments support
- Task search and filtering

### Time Tracking
- Manual time entry for tasks
- Built-in timer functionality
- Time tracking reports and analytics
- Daily/weekly/monthly time summaries
- Billable hours tracking

## 🎨 UI/UX Features

- Clean, modern interface similar to Kaneo demo
- Dark/light theme support (planned)
- Fully responsive design (mobile-first)
- Intuitive drag-and-drop interactions
- Real-time updates and notifications
- Keyboard shortcuts for power users
- Loading states and error handling
- Accessible components (ARIA labels, keyboard navigation)

## 🔧 Development

### Available Scripts

```bash
# Development
yarn dev          # Start development server
yarn build        # Build for production
yarn start        # Start production server
yarn lint         # Run ESLint

# Database
yarn db:push      # Push schema to database
yarn db:generate  # Generate Prisma client
yarn db:seed      # Seed database with sample data
yarn db:studio    # Open Prisma Studio
```

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   └── common/            # Common components
├── lib/                   # Utility functions
├── store/                 # Zustand stores
├── types/                 # TypeScript types
└── prisma/                # Database schema and migrations
```

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Configure MySQL database (use PlanetScale or Railway)
4. Deploy with automatic CI/CD from GitHub

### Environment Variables for Production

```env
DATABASE_URL="mysql://username:password@host:port/database"
NEXTAUTH_SECRET="your-production-jwt-secret"
NEXTAUTH_URL="https://your-domain.com"
NODE_ENV="production"
```

## 🧪 Testing

The project includes comprehensive testing strategies:

- Unit tests for utility functions
- Integration tests for API routes
- Component testing with Testing Library
- E2E tests for critical user flows
- Database migration testing

## 🔒 Security Features

- Input validation with Zod schemas
- SQL injection prevention with Prisma
- XSS protection
- CSRF token implementation
- Rate limiting on API routes
- Secure JWT token handling
- Role-based access control

## 📈 Performance Considerations

- Implement proper caching strategies
- Optimize database queries with Prisma
- Use React.memo for expensive components
- Implement virtual scrolling for large task lists
- Compress images and optimize assets
- Server-side rendering for better SEO

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🎉 Acknowledgments

- Inspired by Kaneo (demo.kaneo.app)
- Built with Next.js and shadcn/ui
- Uses Prisma for database management
- Powered by Tailwind CSS for styling

---

**Note**: This is a comprehensive project management application designed for internal company use. It can be deployed on Vercel and used as a full-featured alternative to commercial project management tools.
