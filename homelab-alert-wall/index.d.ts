/**
 * Homelab Sensor Fusion Alert Wall
 *
 * P2P sensor cells fuse temp/ping/power readings into prioritized alerts.
 * Each sensor = a cell. Wall node subscribes to alerts.
 * Zero-infrastructure: no MQTT broker, no cloud, no Home Assistant.
 *
 * Use case: data-hoarder homelabber with 5-20 mixed sensors
 * (Zigbee, ESP32, SBC stats) wanting one wall-mounted status board.
 *
 * Deployment: Raspberry Pi Zero 2W + USB buzzer + 16x2 LCD
 */
export type SensorType = 'temp' | 'ping' | 'power' | 'humidity' | 'cpu' | 'motion';
export interface SensorReading {
    sensorId: string;
    type: SensorType;
    value: number;
    unit: string;
    timestamp: number;
}
export interface SensorCell {
    id: string;
    type: SensorType;
    host: string;
    location: string;
    threshold: {
        warn: number;
        crit: number;
    };
    current: SensorReading | null;
    history: SensorReading[];
    witnesses: Witness[];
}
export interface Witness {
    type: 'BIND' | 'EFFECT' | 'LINK';
    cellId: string;
    t: number;
    data?: any;
}
export type AlertLevel = 'ok' | 'warn' | 'crit';
export interface Alert {
    level: AlertLevel;
    sensorId: string;
    type: SensorType;
    value: number;
    threshold: number;
    message: string;
    timestamp: number;
    correlation: string[];
}
export interface AlertWallCell {
    id: string;
    sensors: Map<string, SensorCell>;
    correlations: Map<string, string[]>;
    alerts: Alert[];
    tickCount: number;
}
export declare function createAlertWall(id?: string): AlertWallCell;
export declare function addSensor(wall: AlertWallCell, id: string, type: SensorType, host: string, location: string, warnThreshold: number, critThreshold: number): SensorCell;
export declare function ingestReading(wall: AlertWallCell, sensorId: string, value: number, unit?: string): SensorCell | null;
export declare function classifyReading(s: SensorCell, value: number): AlertLevel;
export declare function setCorrelation(wall: AlertWallCell, sensorA: string, sensorB: string): void;
export declare function correlatedAlerts(wall: AlertWallCell): Alert[];
export declare function evaluate(wall: AlertWallCell): Alert[];
export declare function renderLCD16x2(wall: AlertWallCell): {
    row1: string;
    row2: string;
};
export interface BuzzerPulse {
    ms: number;
    reason: string;
}
export declare function buzzerPulses(wall: AlertWallCell): BuzzerPulse[];
export declare function statusSummary(wall: AlertWallCell): string;
