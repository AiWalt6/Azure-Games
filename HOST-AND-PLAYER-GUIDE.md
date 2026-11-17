# Cloud & Cornbread: Complete Host and Player Guide

## Start here: three screens, three different jobs

| Screen | Who uses it? | What it contains |
|---|---|---|
| **Host dashboard** | Host only | Current question, private correct answer, question queue, player list, scores, and controls |
| **Presentation** | Everyone watches through Teams | Lobby, questions, timer, revealed answers, celebrations, and standings |
| **Player card** | Each participant | Personal card, current question, revealed answers, score, and round pattern |

**The host questions are already inside the application. You do not need to
write questions or have an AI assistant present.**

### Where exactly are the host questions?

Open the browser tab with `/host/ROOMCODE` in its address and the heading
**PRIVATE HOST CONTROL**.

- **Center, after starting a round:** the current question to read aloud.
- **Below it, before reveal:** **FOR YOUR EYES ONLY**, containing the correct
  answer and explanation.
- **Right side:** **On the menu**, the private queue for the current round.
  Each entry includes its number, answer, category, difficulty, and question.
  Scroll inside this list to see more entries.
- **Below the queue:** **Already asked**, listing answers to questions already
  presented. This list includes the current question once it has been started.

On a narrow screen, **On the menu** moves below the main controls. Use a laptop
or desktop and a reasonably wide window for hosting.

The queue follows its prepared order. **Next question** advances it; clicking a
queue entry does not select or skip to that question.

The player tab (`/join/ROOMCODE`) does not contain host controls. The presentation
tab (`/present/ROOMCODE`) does not contain the private answer or queue.

---

# Part 1: Host instructions

## A. Before the meeting

1. Make sure the game has a reachable **public HTTPS address** if participants
   are remote. `localhost` works only on the computer running the game.
2. Open that public address and click **Host a game** to create a room.
3. Use **Copy private host link** under **Behind the scenes** and save it
   privately. This is your recovery link and grants full room control.
   Do not post it in Teams chat.
4. Click **Copy player link**. This is the safe link to send participants.
5. Click **Open presentation** and keep it in a separate browser window.
6. Arrange your windows:
   - Host dashboard: private, where you will click controls.
   - Presentation: the window to share through Teams.
   - Optional player window: only if you also want a card yourself.
7. In Teams, select **Share**, then choose only the presentation window.
   Do not share your whole desktop or the host dashboard.
8. Test the player link from a separate browser or device.
9. Keep your computer awake and connected for the entire event if it is running
   the game server or a temporary public tunnel.

**Temporary-link warning:** A Cloudflare Quick Tunnel is suitable for rehearsal,
not guaranteed event hosting. Its URL stops working if the tunnel stops and
changes when it restarts. A stable hosted deployment is recommended for the
scheduled event.

## B. Welcome and registration

1. Paste the player link into Teams chat.
2. Leave the presentation on the welcome screen so participants can scan its
   QR code or use the room code on the same public game website.
3. Ask participants to enter a unique display name.
4. Watch **At the table** on your dashboard:
   - Players appear automatically after registration.
   - Online indicators update as their game connections open or close.
   - Marks, scores, and BINGO status update during play.
   - No dashboard refresh is required.
5. Wait for everyone to join before starting. New registrations are allowed
   in the lobby and between rounds, not during an active round.
6. Optionally click **Show 60-second welcome countdown**.
   This is a welcome countdown, not an automatic game start.

### Opening script: read this aloud

> Welcome to Cloud & Cornbread! Open the player link in Teams chat and enter your
> name. Keep your card beside the meeting or open it on your phone.
>
> Your card contains answers. I will read a trivia question, give you thinking
> time, and then reveal the answer. After the reveal, find the matching answer
> on your card and click it.
>
> You do not submit guesses during ordinary rounds. Correct marks earn points.
> The center space is free. The winning pattern changes each round, and the game
> checks BINGOs automatically.
>
> Please do not shout answers into Teams or post them in chat before the reveal.
> This is friendly competition, so enjoy it!

## C. Round 1: The Warm-Up Feast

**Goal:** five marked squares in any horizontal row, vertical column, or diagonal.
The free center counts toward a pattern.

1. Explain the goal.
2. Click **Start the feast**.
3. The first question appears on all connected screens and its timer begins.
4. Read the question from the center of your dashboard.
5. Keep the private answer to yourself.
6. Give players the default 15 seconds to think.
7. Click **Reveal answer**.
8. Read the answer and, if useful, its short explanation.
9. Say: "Find that answer on your card and mark it now."
10. Allow at least 5 seconds for marking.
11. Check for a celebration or connection issue before continuing.
12. Click **Next question**.
13. Repeat.

### The host's repeating sequence

**READ -> THINKING TIME -> REVEAL -> MARKING TIME -> NEXT**

The timer does **not** reveal an answer or advance automatically.
Players do not type answers into the game during regular bingo rounds.
Typing a guess to an assistant or saying it aloud does not mark a square.

## D. What to do when someone gets BINGO

1. The server verifies patterns automatically after each mark.
2. A verified winner triggers a celebration. You do not inspect their card
   or approve the score manually.
3. Congratulate the winner.
4. Leave enough time for other players to finish marking the same answer.
   They can still mark while the winner announcement is displayed.
5. Players who finish while that same question remains revealed share the
   first-place bonus and a round victory.
6. Click **Back to the feast** to dismiss the celebration.
7. Decide whether to continue asking questions for more winners or end the round.
8. If you continue to later questions, additional verified BINGOs earn 50 bonus
   points instead of the first-place bonus.

**Next question is disabled until the current celebration is dismissed.**

## E. Close a round and start the next

1. Give everyone a final opportunity to mark before closing.
2. Click **End round**, then confirm.
3. Once the round is closed, players cannot mark that round's card.
4. Announce the next pattern.
5. Click the button to start the next named round.

### Round 2: The Turkey Trot

- Click **Start The Turkey Trot** after closing Round 1.
- Players receive fresh randomized cards.
- The goal is **all four corners**.
- The first-place bonus is 150 points.
- Use the same read, reveal, mark, next sequence.

### Round 3: The Grand Thanksgiving Showdown

- Click **Start The Grand Thanksgiving Showdown** after closing Round 2.
- Players receive fresh randomized cards.
- The goal is **both diagonals together**, forming a full X.
- The center is free and counts toward the X.
- The first-place bonus is 200 points.
- Use the same question sequence.

Scores carry over across rounds. Cards do not reshuffle during active play.

## F. Timing and other controls

| Control | What the host should know |
|---|---|
| **Question timer + Apply** | Choose 5-120 seconds. Sets the duration for future/restarted question timers; does not replace an already-running countdown. |
| **Restart timer** | Restarts the current question countdown using the selected duration. |
| **Pause / Resume** | Freezes/resumes an active countdown and blocks player marking while paused. Resume before revealing or advancing. |
| **Present leaderboard** | Replaces the public game display with standings during gameplay. |
| **Show game** | Returns the public presentation from standings to the game. |
| **End round** | Closes the current card; requires confirmation. |
| **Export results** | Downloads current player ranks, names, points, and round wins as CSV. |
| **End event** | Closes gameplay and displays final standings; requires confirmation. Use the normal round-ending sequence unless deliberately finishing early. |
| **Reset scores** | Clears points and recorded victories between rounds or after the event. It does not rewind question progress or create fresh cards. |
| **Restart game** | Resets scores, cards, and question progress to the lobby while keeping players in the room. Requires confirmation. |
| **Remove player** | The X beside a name revokes that player's session after confirmation. Use carefully. |
| **Add 15 rehearsal players** | Adds clearly labeled automated participants before play. Use only in a separate rehearsal room. |

The timer and host-paced marking time are intentionally separate. The host can
hold an answer on screen longer if someone needs assistance.

## G. Announce champions and resolve ties

1. After Round 3, click **End round** and confirm.
2. Click **Announce the champions**.
3. Recognize:
   - **Grand Champion:** highest total points.
   - **Cloud & Cornbread Champion:** the overall highest-scoring player.
   - **Bingo Legend:** most first-place round victories; this award can be shared.
4. If the highest total score is tied, click **Start final trivia tiebreaker**.
5. Read the question. Only tied top-scoring players receive an answer-entry field.
6. Finalists type one answer and click **Lock in my answer** before time expires.
7. After submissions or timer expiry, click **Reveal answer**.
8. The first correct answer received by the server earns one deciding point.
   Answers ignore case and punctuation and accept listed aliases.
9. If nobody answers correctly and the top score remains tied, another unused
   tiebreak question can be started. The bank is finite; do not reveal before
   finalists have had time to submit.
10. Click **Export results** to save the final CSV.

## H. Suggested 30-minute running order

| Time | Activity |
|---|---|
| 0:00-3:00 | Join, explain the card, introduce Round 1 |
| 3:00-11:00 | Round 1 |
| 11:00-12:00 | Celebrate and explain four corners |
| 12:00-20:00 | Round 2 |
| 20:00-21:00 | Celebrate and explain the full X |
| 21:00-29:00 | Round 3 |
| 29:00-32:00 | Awards, possible tiebreak, export |

There are 24 callable answers in each round. At 15 seconds per question and
5 seconds for reveal/marking, all 24 take 8 minutes before extra discussion.
You may end a round after its first winners to stay on schedule.

---

# Part 2: Player instructions

## A. Join and get your card

1. Open the **player link** in Teams chat, or scan the public presentation's QR.
2. Enter a unique display name and click **Join the feast**.
3. Keep this browser tab open.
4. Keep Teams visible beside it, or use your phone for the card.
5. Wait for the host to start. Your card may be freshly dealt when the round
   starts, so use the card displayed during the active round.

No Microsoft sign-in or Teams app installation is required.

## B. Answer, reveal, mark

1. Read or listen to the question.
2. Think of your answer privately.
3. **Wait for the host to reveal it.**
4. Find the exact matching answer on your card.
5. Click or tap the square.
6. It changes color and adds 10 points.

An eligible unmarked answer has a blue outline. Unrevealed answers are disabled.
The free center is already marked and does not earn points.

**Example**

- Question: "Which Azure service safeguards application secrets and certificates?"
- Revealed answer: **Azure Key Vault**
- Your action: tap **Azure Key Vault** on your card.

This is answer-matching bingo, not a scored quiz submission. You do not have to
type a guess or prove that you knew the answer before the reveal to mark it.
You earn points for correctly marking called answers and completing patterns.

## C. Know the three winning patterns

`X` means the square must be marked; `F` is the free center.

### Round 1: any full row, column, or diagonal

This shows one valid row; other rows, columns, and either diagonal also count:

```text
X X X X X
. . . . .
. . F . .
. . . . .
. . . . .
```

### Round 2: all four corners

```text
X . . . X
. . . . .
. . F . .
. . . . .
X . . . X
```

### Round 3: both diagonals, making a full X

```text
X . . . X
. X . X .
. . F . .
. X . X .
X . . . X
```

The current pattern is shown beside or below your card.

## D. Call BINGO and keep playing

- The game checks your pattern automatically after each mark.
- You can also press **Call BINGO!** to request verification.
- An incomplete pattern will not receive a bonus.
- Repeated clicks do not award extra points.
- Keep marking during celebrations: you can share first place if you complete
  the pattern before the host moves to a later question.
- You may keep marking other revealed answers even after your BINGO, until the
  host closes the round.
- Previously revealed answers remain eligible during later answer-reveal
  phases of the same round. They cannot be marked while a question is being
  asked, while paused, or after the round closes.

## E. Scoring

| Action | Points |
|---|---:|
| Correctly mark a revealed answer | +10 |
| First-place BINGO in Round 1 | +100 bonus |
| First-place BINGO in Round 2 | +150 bonus |
| First-place BINGO in Round 3 | +200 bonus |
| Complete BINGO on a later question after the first winners | +50 bonus |
| Win a final trivia tiebreaker | +1 deciding point |

Same-question finishers share the full first-place bonus. A player receives
only one BINGO bonus per round. Scores carry over to the next round.

## F. If you reach a final tiebreaker

The host announces this explicitly.

1. Only players tied for the highest total score can answer.
2. Type your answer into the field on your player screen.
3. Click **Lock in my answer** before the timer expires.
4. You have one submission; it cannot be edited.
5. The fastest correct submission wins the deciding point when the host reveals.

Unlike ordinary bingo questions, this final question requires a typed submission.

## G. Friendly rules

- Do not shout or post answers before the reveal.
- Do not use web searches or outside help during competitive play.
- Keep your own card; do not share another player's browser session.
- Follow the host's pacing and announcements.
- Cheer for colleagues and enjoy the event.

---

# Part 3: Troubleshooting

| Problem | What to do |
|---|---|
| Phone cannot open the QR link | Check that the QR uses the public HTTPS address, not `localhost` or `127.0.0.1`. |
| Public temporary link stopped working | The host must keep the computer online and awake and both server/tunnel processes running. Restarting a tunnel creates a different URL. |
| I cannot find host questions | Switch to the private `/host/ROOMCODE` tab. Look in the center and under **On the menu**. On a small screen, scroll below the controls. |
| Host URL asks for a credential | Open the saved **private host link** in that browser. A bare dashboard URL or public player link does not grant host access. |
| I see “not yet revealed” | Wait for the host's reveal. Only called answers can be marked. |
| The answer was revealed but I cannot mark | Check that the game is not paused, the round is still open, and your connection is live. Already-marked squares cannot be clicked again. |
| Timer reached zero and nothing happened | Normal behavior: the host must click **Reveal answer**. |
| Next question is disabled | Reveal first, resume if paused, dismiss any celebration, and check whether all 24 questions have been used. |
| All 24 questions are finished | Give everyone time to mark, then **End round**. There is no 25th question in that round. |
| New participant cannot join | Registration is available in the lobby and between rounds. Wait until the host closes the active round. |
| My name is taken | Choose a different name. Names must be unique within the room. |
| I refreshed the page | Reopen the same player link in the same browser profile. Your saved session restores your card and score. |
| I changed browser/device or cleared browser data | Player credentials do not follow your name. Ask the host for help; there is no name-only recovery. |
| Connection was interrupted | Wait for automatic reconnect. Your saved progress remains on the server. Avoid repeatedly registering new identities. |
| Host roster is not changing | Confirm the dashboard and players use the same public hostname and room code, and that both show **LIVE & CONNECTED**. |
| No sound | Sound is off by default. Click the speaker button to enable it. Browser interaction may be required. |

## One-minute host reminder

1. Public player link in Teams chat.
2. Private dashboard for controls; presentation window for screen sharing.
3. Wait for registration and explain the pattern.
4. Start the round.
5. **Read -> wait -> reveal -> allow marking -> next.**
6. Celebrate verified BINGOs; dismiss the celebration before advancing.
7. End round; explain and start the next pattern.
8. After Round 3, announce champions, resolve a top-score tie, and export.

## Copy-and-paste player message for Teams chat

> Welcome to Cloud & Cornbread! Open the player link below, enter your name, and
> keep your bingo card open beside Teams or on your phone.
>
> Watch the questions. After the host reveals each answer, tap its matching
> square on your card. Every correct mark earns 10 points.
>
> Round 1: any row, column, or diagonal. Round 2: four corners.
> Round 3: a full X across both diagonals. The center is free.
>
> BINGOs are checked automatically, and you can also press Call BINGO.
> Please wait for reveals and don't share answers early.
>
> PLAYER LINK: [Host: paste Copy player link here]
