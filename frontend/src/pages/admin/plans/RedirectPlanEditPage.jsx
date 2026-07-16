import { Navigate, useParams } from 'react-router-dom';

export default function RedirectPlanEditPage() {
  const { id } = useParams();

  return <Navigate to={`/admin/configuracion?tab=planes&editar=${id}`} replace />;
}
