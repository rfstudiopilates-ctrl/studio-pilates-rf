import { Navigate, useParams } from 'react-router-dom';

export default function RedirectClientEditPage() {
  const { id } = useParams();

  return <Navigate to={`/admin/clientes?editar=${id}`} replace />;
}
