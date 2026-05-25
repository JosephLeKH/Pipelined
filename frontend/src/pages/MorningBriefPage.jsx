/** Redirect shim — email deep links land on /today with the brief expanded. */

import { Navigate } from "react-router-dom";

function MorningBriefPage() {
  return <Navigate to="/today?brief=open" replace />;
}

export default MorningBriefPage;
