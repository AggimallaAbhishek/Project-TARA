import {
  ArrowRight,
  Clock,
  Edit3,
  Eye,
  FileX,
  History,
  Shield,
  User,
  Wifi,
} from 'lucide-react';

export const TITLE_MAX_LENGTH = 255;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const UML_CODE_MAX_LENGTH = 250000;
export const UML_CODE_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const UML_CODE_ACCEPT_TYPES = '.mmd,.mermaid,.puml,.plantuml,.uml,.txt';
export const MAX_DIAGRAM_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DIAGRAM_ACCEPT_TYPES = '.png,.jpg,.jpeg,.pdf,.mmd,.mermaid,.puml,.plantuml,.uml,.drawio,.xml';
export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_ACCEPT_TYPES = '.pdf,.txt';
export const UML_FORMAT_OPTIONS = [
  { value: 'mermaid', label: 'Mermaid' },
  { value: 'plantuml', label: 'PlantUML' },
];

export const examples = [
  {
    title: 'E-Commerce Platform',
    description: 'Online shopping platform with user authentication, product catalog, shopping cart, payment processing via Stripe, and order management. Uses React frontend, Node.js backend, PostgreSQL database.',
  },
  {
    title: 'Healthcare Portal',
    description: 'Patient portal for viewing medical records, scheduling appointments, messaging doctors. Integrates with hospital EHR via HL7 FHIR API. OAuth 2.0 authentication, encrypted database for PHI.',
  },
  {
    title: 'Banking Mobile App',
    description: 'Mobile banking app with biometric login, account management, fund transfers, bill payments. REST API backend with 2FA, transaction signing, real-time fraud detection.',
  },
];

export const strideCategories = [
  { letter: 'S', name: 'Spoofing', icon: User, color: 'text-purple-400' },
  { letter: 'T', name: 'Tampering', icon: Edit3, color: 'text-blue-400' },
  { letter: 'R', name: 'Repudiation', icon: FileX, color: 'text-pink-400' },
  { letter: 'I', name: 'Info Disclosure', icon: Eye, color: 'text-cyan-400' },
  { letter: 'D', name: 'Denial of Service', icon: Wifi, color: 'text-amber-400' },
  { letter: 'E', name: 'Elevation of Privilege', icon: Shield, color: 'text-red-400' },
];

export const quickActionIcons = {
  ArrowRight,
  Clock,
  History,
  Shield,
};
