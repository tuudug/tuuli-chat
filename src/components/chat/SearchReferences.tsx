import React from "react";
import { ExternalLinkIcon } from "lucide-react";

interface SearchReferencesProps {
  references: {
    url: string;
    title: string;
  }[];
}

const SearchReferences: React.FC<SearchReferencesProps> = ({ references }) => {
  if (!references || references.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-gray-700/20 pt-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <ExternalLinkIcon size={12} className="text-gray-400" />
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
          Sources ({references.length})
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {references.map((ref, index) => (
          <a
            key={index}
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] bg-gray-800/40 hover:bg-gray-700/40 text-gray-300 hover:text-gray-100 px-1.5 py-0.5 rounded border border-gray-700/30 hover:border-gray-600/50 transition-all duration-200 max-w-[180px]"
            title={ref.title}
          >
            <span className="truncate">{ref.title}</span>
            <ExternalLinkIcon size={9} className="flex-shrink-0 opacity-60" />
          </a>
        ))}
      </div>
    </div>
  );
};

export default SearchReferences;
