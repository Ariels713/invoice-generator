# AI Invoice Generator

A modern web application that helps you generate professional invoices with AI assistance. Built with Next.js, React, TypeScript, and Tailwind CSS.

## Features

- AI-powered invoice parsing from plain text
- Real-time invoice preview
- PDF generation and download
- Email delivery
- Multiple currency support
- Responsive design
- Form validation
- Modern UI/UX

## Tech Stack

- Next.js 14
- React 19
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- OpenAI API
- SendGrid
- jsPDF
- html2canvas

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- SendGrid API key (for email functionality)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
OPENAI_API_KEY=your_openai_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/invoice-generator.git
cd invoice-generator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter invoice details manually or use the AI parser by describing the invoice in plain text.
2. Fill in the required fields (company information, items, tax rate, etc.).
3. Preview the invoice in real-time.
4. Download the invoice as PDF or send it via email.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
