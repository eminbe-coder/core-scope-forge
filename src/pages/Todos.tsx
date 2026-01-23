import { Navigate } from 'react-router-dom';

/**
 * Legacy Todos page - redirects to /my-todos which uses the proper todos table
 */
const Todos = () => {
  return <Navigate to="/my-todos" replace />;
};

export default Todos;
