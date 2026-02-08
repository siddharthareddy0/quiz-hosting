import Card from '../components/ui/Card.jsx';

export default function AdminPlaceholderPage({ title }) {
  return (
    <Card className="p-6">
      <div className="text-xs font-semibold text-ink-600">Module</div>
      <div className="mt-1 text-2xl font-extrabold text-ink-900">{title}</div>
      <div className="mt-2 text-sm text-ink-600">This module will be implemented next.</div>
    </Card>
  );
}
