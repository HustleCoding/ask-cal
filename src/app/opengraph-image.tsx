import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const alt = "Ask Cal — answers from Cal Newport's archive";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fraunces = fs.readFileSync(
    path.join(process.cwd(), "src/assets/fraunces-600.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf8f2",
          fontFamily: "Fraunces",
          color: "#2e2a24",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 34,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#5b564c",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: "#2f5d46",
            }}
          />
          Ask Cal
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 92,
            lineHeight: 1.1,
            textAlign: "center",
            maxWidth: 980,
          }}
        >
          What would Cal Newport say?
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 28,
            color: "#5b564c",
          }}
        >
          1,117 essays · 2007 – present
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 14,
            backgroundColor: "#2f5d46",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Fraunces",
          data: fraunces,
          weight: 600,
          style: "normal",
        },
      ],
    }
  );
}
