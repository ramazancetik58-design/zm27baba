/**
 * True FIFA-regulation 1:1 meter pitch constants shared across
 * the 3D WebGL match engine, colossal stadium builder, and 2D radar view.
 */
export const PITCH_W = 68; // Touchline to touchline (meters): X in [-34, +34]
export const PITCH_L = 105; // Goal line to goal line (meters): Z in [-52.5, +52.5]
export const HALF_PITCH_W = PITCH_W / 2; // 34m
export const HALF_PITCH_L = PITCH_L / 2; // 52.5m

export const GRASS_RUNOFF_X = 6; // 3m extra turf outside each touchline
export const GRASS_RUNOFF_Z = 8; // 4m extra turf behind each goal line
export const TURF_MESH_W = PITCH_W + GRASS_RUNOFF_X; // 74m
export const TURF_MESH_L = PITCH_L + GRASS_RUNOFF_Z; // 113m

export const GOAL_WIDTH = 7.32;
export const GOAL_HEIGHT = 2.44;
export const GOAL_DEPTH = 2.1;
export const BALL_RADIUS = 0.25;
