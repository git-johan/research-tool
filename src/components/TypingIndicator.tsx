"use client";

export function TypingIndicator() {
  return (
    <div className="animate-fade-in mb-4 mt-6 first:mt-0">
      <div className="flex items-center h-[20px] mt-2">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
