import { Compass } from 'lucide-react';
import { ButtonLink } from '../ui/ButtonLink';
import { EmptyState } from '../ui/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Página no encontrada"
      description="La dirección que abriste no existe o cambió."
      action={<ButtonLink to="/">Ir al inicio</ButtonLink>}
    />
  );
}
