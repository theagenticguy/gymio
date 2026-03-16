import { LayoutSwitcher } from "./layouts/LayoutSwitcher";
import { useWebSocket } from "./hooks/useWebSocket";
import { useDemoMode } from "./hooks/useDemoMode";

function WebSocketConnector() {
  useWebSocket();
  return null;
}

function App() {
  const isDemo = useDemoMode();

  return (
    <div className="dark">
      {!isDemo && <WebSocketConnector />}
      <LayoutSwitcher />
    </div>
  );
}

export default App;
