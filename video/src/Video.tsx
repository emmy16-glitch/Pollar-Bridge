import React from "react";
import { Composition, staticFile, Audio, AbsoluteFill, Sequence } from "remotion";
import {
  Scene1Title,
  Scene2Problem,
  Scene3AgentRail,
  Scene4Safety,
  Scene5Outro,
} from "./Root";

const FPS = 30;
// Scene durations in seconds (tuned to the voiceover narration)
const DUR = { s1: 7, s2: 11, s3: 14, s4: 11, s5: 8 };
const TOTAL = DUR.s1 + DUR.s2 + DUR.s3 + DUR.s4 + DUR.s5; // 51s

const Crossfade: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>{children}</AbsoluteFill>
);

export const Demo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#080B14" }}>
      <AbsoluteFill>
        <Scene1Title />
      </AbsoluteFill>
      <Sequence from={DUR.s1 * FPS} durationInFrames={(DUR.s2 + DUR.s3 + DUR.s4 + DUR.s5) * FPS}>
        <AbsoluteFill>
          <Scene2Problem />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={(DUR.s1 + DUR.s2) * FPS} durationInFrames={(DUR.s3 + DUR.s4 + DUR.s5) * FPS}>
        <AbsoluteFill>
          <Scene3AgentRail />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={(DUR.s1 + DUR.s2 + DUR.s3) * FPS} durationInFrames={(DUR.s4 + DUR.s5) * FPS}>
        <AbsoluteFill>
          <Scene4Safety />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={(DUR.s1 + DUR.s2 + DUR.s3 + DUR.s4) * FPS} durationInFrames={DUR.s5 * FPS}>
        <AbsoluteFill>
          <Scene5Outro />
        </AbsoluteFill>
      </Sequence>
      <Audio src={staticFile("vo.mp3")} />
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="PollarBridgeDemo"
    component={Demo}
    durationInFrames={TOTAL * FPS}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
