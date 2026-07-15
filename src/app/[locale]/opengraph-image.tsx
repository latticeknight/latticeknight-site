import { ImageResponse } from "next/og";

import { getDictionary } from "@/content/get-dictionary";
import { isLocale } from "@/lib/site";

export const alt = "Eduardo Neto · latticeknight";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const nodes = [
  [660, 94],
  [748, 54],
  [842, 106],
  [936, 62],
  [1052, 118],
  [1142, 82],
  [700, 198],
  [804, 176],
  [900, 226],
  [1016, 194],
  [1122, 238],
  [642, 316],
  [754, 286],
  [858, 350],
  [972, 300],
  [1084, 358],
  [1172, 312],
  [684, 448],
  [798, 420],
  [912, 480],
  [1028, 434],
  [1138, 502],
  [742, 570],
  [864, 550],
  [988, 584],
  [1090, 558],
] as const;

const edges = [
  [0, 1], [0, 6], [0, 7], [1, 2], [1, 7], [2, 3], [2, 7], [2, 8],
  [3, 4], [3, 8], [3, 9], [4, 5], [4, 9], [4, 10], [5, 10], [6, 7],
  [6, 11], [6, 12], [7, 8], [7, 12], [8, 9], [8, 12], [8, 13], [8, 14],
  [9, 10], [9, 14], [10, 15], [10, 16], [11, 12], [11, 17], [12, 13],
  [12, 17], [12, 18], [13, 14], [13, 18], [13, 19], [14, 15], [14, 19],
  [14, 20], [15, 16], [15, 20], [15, 21], [16, 21], [17, 18], [17, 22],
  [18, 19], [18, 22], [18, 23], [19, 20], [19, 23], [19, 24], [20, 21],
  [20, 24], [20, 25], [21, 25], [22, 23], [23, 24], [24, 25], [2, 12],
  [7, 13], [9, 15], [12, 19], [14, 21], [18, 24],
] as const;

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : "en";
  const dictionary = await getDictionary(safeLocale);
  const statement = dictionary.common.introStatement;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "#f3f1eb",
          background:
            "radial-gradient(circle at 84% 48%, rgba(108, 193, 221, 0.14), transparent 34%), linear-gradient(135deg, #05090d 0%, #070b10 58%, #0b1117 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <radialGradient id="nodeGlow">
              <stop offset="0%" stopColor="#d7f6ff" stopOpacity="1" />
              <stop offset="100%" stopColor="#79bdd3" stopOpacity="0.1" />
            </radialGradient>
          </defs>
          {edges.map(([start, end], index) => (
            <line
              key={`edge-${index}`}
              x1={nodes[start][0]}
              y1={nodes[start][1]}
              x2={nodes[end][0]}
              y2={nodes[end][1]}
              stroke={index % 7 === 0 ? "#9bd9eb" : "#6092a5"}
              strokeOpacity={index % 7 === 0 ? "0.42" : "0.2"}
              strokeWidth={index % 7 === 0 ? "1.8" : "1"}
            />
          ))}
          {nodes.map(([cx, cy], index) => (
            <g key={`node-${index}`}>
              <circle
                cx={cx}
                cy={cy}
                r={index % 6 === 0 ? "18" : "10"}
                fill="url(#nodeGlow)"
                opacity={index % 6 === 0 ? "0.26" : "0.12"}
              />
              <circle
                cx={cx}
                cy={cy}
                r={index % 6 === 0 ? "4.5" : "2.8"}
                fill={index % 9 === 0 ? "#d5a952" : "#b9e8f5"}
                opacity={index % 6 === 0 ? "0.95" : "0.68"}
              />
            </g>
          ))}
        </svg>

        <div
          style={{
            position: "absolute",
            top: 58,
            left: 66,
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 18,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#9ad8ea",
          }}
        >
          <span>latticeknight</span>
          <span style={{ color: "#59656d" }}>/</span>
          <span style={{ color: "#a6aaa8" }}>one system</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 66,
            top: 142,
            width: 690,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.035em",
            }}
          >
            Eduardo Neto
          </div>
          <div
            style={{
              width: 560,
              height: 3,
              display: "flex",
              marginTop: 30,
              marginBottom: 28,
              background: "linear-gradient(90deg, #8fd2e5, rgba(143, 210, 229, 0))",
            }}
          />
          <div
            style={{
              display: "flex",
              maxWidth: 650,
              fontSize: safeLocale === "pt" ? 37 : 44,
              fontWeight: 600,
              lineHeight: 1.14,
              letterSpacing: "-0.025em",
              color: "#d6d4ce",
            }}
          >
            {dictionary.home.socialRole}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 66,
            bottom: 58,
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "#a4a8a6",
            fontSize: 17,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <span>{statement[0]}</span>
          <span style={{ color: "#d5a952" }}>·</span>
          <span>{statement[1]}</span>
        </div>

        <div
          style={{
            position: "absolute",
            right: 66,
            bottom: 54,
            display: "flex",
            color: "#6f7d84",
            fontSize: 16,
            letterSpacing: "0.14em",
          }}
        >
          EDUARDONETO.COM
        </div>
      </div>
    ),
    size,
  );
}
