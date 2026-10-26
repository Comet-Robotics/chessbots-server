// Re-export types and constructor for backwards compatibility.
// Most code should use the plain objects from "./message" directly.
export type {
    SimulatedRobotLocation,
    StackFrame,
    SimulatorUpdateMessage,
} from "./message";
export { createSimulatorUpdateMessage as SimulatorUpdateMessage } from "./message";
