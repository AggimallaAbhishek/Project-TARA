import { useState } from 'react';

export default function SystemInputForm({ onSubmit, isLoading }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() && description.trim()) {
      onSubmit(title, description);
    }
  };

  const exampleSystems = [
    {
      title: "E-Commerce Web Application",
      description: "A web application with user authentication (login/signup), product catalog, shopping cart, payment processing via Stripe API, user profile management, and order history. The backend uses Node.js with Express, PostgreSQL database, and Redis for session management. Frontend is React SPA. Deployed on AWS with load balancer."
    },
    {
      title: "Healthcare Patient Portal",
      description: "A patient portal allowing users to view medical records, schedule appointments, message doctors, and manage prescriptions. Includes integration with hospital EHR system via HL7 FHIR API. Uses OAuth 2.0 for authentication, stores PHI data in encrypted database. Mobile app available for iOS and Android."
    },
    {
      title: "Banking Mobile App",
      description: "Mobile banking application with account management, fund transfers, bill payments, and mobile check deposit. Uses biometric authentication (fingerprint/face), two-factor authentication via SMS/email. Communicates with core banking system via REST APIs. Implements certificate pinning for API calls."
    }
  ];

  const loadExample = (example) => {
    setTitle(example.title);
    setDescription(example.description);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Analysis Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="e.g., E-Commerce Platform Security Analysis"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          System Architecture Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Describe your system architecture in detail. Include: components, technologies used, data flows, authentication mechanisms, external integrations, deployment environment, etc."
          required
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-gray-500">
          The more detail you provide, the more accurate the threat analysis will be.
        </p>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Quick Examples:</p>
        <div className="flex flex-wrap gap-2">
          {exampleSystems.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadExample(example)}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors disabled:opacity-50"
            >
              {example.title}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !title.trim() || !description.trim()}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing with AI...
          </>
        ) : (
          <>🔍 Analyze System Threats</>
        )}
      </button>
    </form>
  );
}
