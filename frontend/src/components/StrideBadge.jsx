export default function StrideBadge({ category }) {
  const getColors = (cat) => {
    switch (cat) {
      case 'Spoofing':
        return 'bg-purple-100 text-purple-700';
      case 'Tampering':
        return 'bg-blue-100 text-blue-700';
      case 'Repudiation':
        return 'bg-pink-100 text-pink-700';
      case 'Information Disclosure':
        return 'bg-cyan-100 text-cyan-700';
      case 'Denial of Service':
        return 'bg-amber-100 text-amber-700';
      case 'Elevation of Privilege':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getInitial = (cat) => {
    if (!cat) return '?';
    if (cat === 'Information Disclosure') return 'I';
    if (cat === 'Denial of Service') return 'D';
    if (cat === 'Elevation of Privilege') return 'E';
    return cat[0];
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getColors(category)}`}>
      <span className="w-4 h-4 rounded-full bg-white/50 flex items-center justify-center mr-1.5 text-[10px] font-bold">
        {getInitial(category)}
      </span>
      {category}
    </span>
  );
}
