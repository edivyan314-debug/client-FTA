export default function DemoModeBar() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null;
  return (
    <div className="bg-orange-500 text-white text-center py-2 px-4 text-sm font-medium">
      🎭 DEMO MODE — AI responses are cached. No external API calls made. Prototype only.
    </div>
  );
}

