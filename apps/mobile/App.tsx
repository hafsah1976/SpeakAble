import { StatusBar } from "expo-status-bar";
import { AuthGate } from "./src/screens/AuthGate";

export default function App() {
  return (
    <>
      <AuthGate />
      <StatusBar style="dark" />
    </>
  );
}
