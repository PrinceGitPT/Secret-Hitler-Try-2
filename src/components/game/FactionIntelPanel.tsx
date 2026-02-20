import type { ViewerIdentity } from "@/lib/game/types";

interface FactionIntelPanelProps {
  viewer?: ViewerIdentity;
  roomSize: number;
}

function roleLabel(role: "FASCIST" | "HITLER"): string {
  return role === "HITLER" ? "Hitler" : "Fascist";
}

export function FactionIntelPanel({ viewer, roomSize }: FactionIntelPanelProps) {
  return (
    <div className="panel placeholder-box">
      <h4>Your Team Intel</h4>
      {!viewer ? (
        <p>Role and team intel appear after the game starts.</p>
      ) : (
        <>
          <p>
            Team: <strong>{viewer.team}</strong> | Role:{" "}
            <strong>{viewer.isHitler ? "Hitler" : viewer.role === "FASCIST" ? "Fascist" : "Liberal"}</strong>
          </p>

          {viewer.knownFactionMembers.length > 0 ? (
            <ul className="intel-list">
              {viewer.knownFactionMembers.map((member) => (
                <li key={member.id} className="intel-item">
                  <span>{member.name}</span>
                  <span>{roleLabel(member.role)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="intel-note">
              {viewer.role === "HITLER" && roomSize >= 7
                ? "In 7-10 player games, Hitler does not know who the fascists are at setup."
                : "No additional faction identities are visible to your role."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
