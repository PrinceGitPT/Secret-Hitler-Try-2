"use client";

interface VotePanelProps {
  totalPlayers: number;
  votesReceived: number;
  canVote: boolean;
  hasVoted: boolean;
  onVote: (vote: "JA" | "NEIN") => void;
  disabled?: boolean;
}

export function VotePanel({
  totalPlayers,
  votesReceived,
  canVote,
  hasVoted,
  onVote,
  disabled
}: VotePanelProps) {
  return (
    <div>
      <h4>Vote</h4>
      <p className="info-inline">
        Votes submitted: {votesReceived}/{totalPlayers}
      </p>
      <div className="vote-options">
        <button
          type="button"
          className="button-primary"
          onClick={() => onVote("JA")}
          disabled={!canVote || disabled}
        >
          JA
        </button>
        <button
          type="button"
          className="button-danger"
          onClick={() => onVote("NEIN")}
          disabled={!canVote || disabled}
        >
          NEIN
        </button>
      </div>
      {!canVote && hasVoted ? <p className="center-note">You have already voted this round.</p> : null}
    </div>
  );
}
