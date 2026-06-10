import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { decodeShare } from "@/lib/share";

export const alt = "A shared answer from Ask Cal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shared = decodeShare(token);
  const question = shared?.q ?? "What would Cal Newport say?";

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
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 30,
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
          Someone asked Cal
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: question.length > 80 ? 56 : 72,
            lineHeight: 1.15,
            textAlign: "center",
            maxWidth: 1020,
          }}
        >
          {question.length > 140 ? `${question.slice(0, 140)}…` : question}
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 26,
            color: "#5b564c",
          }}
        >
          Answered from 20 years of essays & podcasts
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
