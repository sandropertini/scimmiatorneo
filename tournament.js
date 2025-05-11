// Stato globale
let teams = [];
let competition = null; // { type: 'league' | 'tournament', data: calendar/tournament }
let standings = [];
let currentRound = 0; // Per campionato: giornata, per torneo: turno
let tournamentPositions = []; // Per torneo: posizioni finali (1°, 2°, ecc.)

// Carica il file JSON delle squadre
function loadTeams() {
    const fileInput = document.getElementById('teams-file');
    const file = fileInput.files[0];
    if (!file) {
        alert('Carica un file JSON!');
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.teams) {
                alert('File JSON non valido!');
                return;
            }
            teams = data.teams;
            displayTeams();
            document.getElementById('teams-list').style.display = 'block';
        } catch (err) {
            alert(`Errore nel leggere il file: ${err.message}`);
        }
    };
    reader.readAsText(file);
}

// Visualizza le squadre caricate
function displayTeams() {
    const teamsList = document.getElementById('teams');
    teamsList.innerHTML = '';
    teams.forEach(team => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${team.player}</strong>: ${team.characters.map(c => `ID: ${c.id} - ${c.name} (${c.position})`).join(', ')}`;
        teamsList.appendChild(li);
    });
}

// Genera la competizione selezionata
function generateCompetition() {
    const type = document.getElementById('competition-type').value;
    if (teams.length < 2) {
        alert('Sono necessarie almeno 2 squadre per generare una competizione!');
        return;
    }

    if (type === 'league') {
        generateLeague();
    } else {
        generateTournament();
    }

    currentRound = 0;
    document.getElementById('competition-section').style.display = 'block';
    document.getElementById('tournament-standings').style.display = type === 'tournament' ? 'block' : 'none';
    document.getElementById('standings').parentElement.style.display = type === 'league' ? 'block' : 'none';
}

// Genera il calendario del campionato (andata e ritorno)
function generateLeague() {
    competition = { type: 'league', data: [] };
    const teamNames = teams.map(t => t.player);
    const numTeams = teamNames.length;
    const numMatchdays = (numTeams - 1) * 2;
    const matchesPerDay = numTeams / 2;

    for (let matchday = 0; matchday < numMatchdays; matchday++) {
        const matches = [];
        for (let i = 0; i < matchesPerDay; i++) {
            const home = (i + matchday) % (numTeams - 1);
            let away = (numTeams - 1 - i + matchday) % (numTeams - 1);
            if (i === 0) away = numTeams - 1;
            const isReturn = matchday >= numTeams - 1;
            matches.push({
                home: isReturn ? teamNames[away] : teamNames[home],
                away: isReturn ? teamNames[home] : teamNames[away],
                played: false,
                homeGoals: 0,
                awayGoals: 0,
                goals: []
            });
        }
        competition.data.push({ matchday: matchday + 1, matches });
    }

    standings = teams.map(team => ({
        team: team.player,
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0
    }));

    document.getElementById('competition-title').textContent = 'Campionato';
    displayCalendar();
    updateStandings();
}

// Genera il torneo a scontri diretti
function generateTournament() {
    competition = { type: 'tournament', data: [] };
    tournamentPositions = [];
    let teamNames = teams.map(t => t.player);
    const numTeams = teamNames.length;
    const powerOfTwo = Math.pow(2, Math.ceil(Math.log2(numTeams)));
    
    // Aggiungi squadre "bye" se necessario
    while (teamNames.length < powerOfTwo) {
        teamNames.push('BYE');
    }

    // Mescola le squadre
    teamNames = shuffleArray(teamNames);

    // Genera il primo turno
    const firstRound = [];
    for (let i = 0; i < teamNames.length; i += 2) {
        firstRound.push({
            home: teamNames[i],
            away: teamNames[i + 1],
            played: false,
            homeGoals: 0,
            awayGoals: 0,
            goals: []
        });
    }
    competition.data.push({ round: 'Quarti di Finale', matches: firstRound });

    // Genera turni successivi (semifinali, finale, spareggio)
    const numRounds = Math.log2(powerOfTwo);
    for (let i = 1; i < numRounds; i++) {
        const roundName = i === numRounds - 1 ? 'Finale' : `Semifinali`;
        const matches = Array(powerOfTwo / Math.pow(2, i + 1)).fill().map(() => ({
            home: null,
            away: null,
            played: false,
            homeGoals: 0,
            awayGoals: 0,
            goals: []
        }));
        competition.data.push({ round: roundName, matches });
    }

    // Aggiungi spareggio 3°/4° posto
    competition.data.push({
        round: 'Spareggio 3°/4° Posto',
        matches: [{
            home: null,
            away: null,
            played: false,
            homeGoals: 0,
            awayGoals: 0,
            goals: []
        }]
    });

    standings = teams.map(team => ({
        team: team.player,
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0
    }));

    document.getElementById('competition-title').textContent = 'Torneo a Scontri Diretti';
    displayCalendar();
    updateTournamentStandings();
}

// Mescola un array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Visualizza il calendario
function displayCalendar() {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';
    if (competition.type === 'league') {
        competition.data.forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'round';
            dayDiv.innerHTML = `<h4>Giornata ${day.matchday}</h4>`;
            const ul = document.createElement('ul');
            day.matches.forEach(match => {
                if (match.home !== 'BYE' && match.away !== 'BYE') {
                    const li = document.createElement('li');
                    let resultText = `${match.home} vs ${match.away}`;
                    if (match.played) {
                        resultText += `: ${match.homeGoals} - ${match.awayGoals}`;
                        const goalDetails = match.goals.map(goal => `${goal.characterName} (${goal.team}) al ${goal.minute}'`).join(', ');
                        if (goalDetails) resultText += ` (${goalDetails})`;
                    }
                    li.textContent = resultText;
                    ul.appendChild(li);
                }
            });
            dayDiv.appendChild(ul);
            calendarDiv.appendChild(dayDiv);
        });
    } else {
        competition.data.forEach((round, index) => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'round';
            roundDiv.innerHTML = `<h4>${round.round}</h4>`;
            const ul = document.createElement('ul');
            round.matches.forEach(match => {
                if (match.home && match.away && match.home !== 'BYE' && match.away !== 'BYE') {
                    const li = document.createElement('li');
                    let resultText = `${match.home} vs ${match.away}`;
                    if (match.played) {
                        resultText += `: ${match.homeGoals} - ${match.awayGoals}`;
                        const goalDetails = match.goals.map(goal => `${goal.characterName} (${goal.team}) al ${goal.minute}'`).join(', ');
                        if (goalDetails) resultText += ` (${goalDetails})`;
                    }
                    li.textContent = resultText;
                    ul.appendChild(li);
                }
            });
            roundDiv.appendChild(ul);
            calendarDiv.appendChild(roundDiv);
        });
    }
}

// Aggiorna la classifica (per campionato)
function updateStandings() {
    const standingsTable = document.getElementById('standings');
    standingsTable.innerHTML = '';
    standings.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
    standings.forEach(team => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${team.team}</td>
            <td>${team.points}</td>
            <td>${team.wins}</td>
            <td>${team.draws}</td>
            <td>${team.losses}</td>
            <td>${team.goalsFor}</td>
            <td>${team.goalsAgainst}</td>
            <td>${team.goalsFor - team.goalsAgainst}</td>
        `;
        standingsTable.appendChild(tr);
    });
}

// Aggiorna la classifica del torneo
function updateTournamentStandings() {
    const positionsList = document.getElementById('tournament-positions');
    positionsList.innerHTML = '';
    tournamentPositions.forEach((pos, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}°: ${pos.team}`;
        positionsList.appendChild(li);
    });
}

// Inizia l'inserimento dei risultati
function startMatchdayInput() {
    if (currentRound >= competition.data.length) {
        alert('Competizione completata!');
        return;
    }

    const round = competition.data[currentRound];
    const inputDiv = document.getElementById('match-results-input');
    inputDiv.innerHTML = '';
    document.getElementById('current-matchday').textContent = competition.type === 'league' ? `Giornata ${round.matchday}` : round.round;
    document.getElementById('matchday-input').style.display = 'block';

    round.matches.forEach((match, matchIndex) => {
        if (!match.played && match.home && match.away && match.home !== 'BYE' && match.away !== 'BYE') {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match-input';
            matchDiv.innerHTML = `<strong>${match.home} vs ${match.away}</strong><br>
                <label>Gol ${match.home}: </label>
                <input type="number" min="0" id="home-goals-${matchIndex}" placeholder="Totale Gol" required>
                <div id="home-goals-details-${matchIndex}"></div>
                <label>Gol ${match.away}: </label>
                <input type="number" min="0" id="away-goals-${matchIndex}" placeholder="Totale Gol" required>
                <div id="away-goals-details-${matchIndex}"></div>
            `;

            const homeGoalsInput = matchDiv.querySelector(`#home-goals-${matchIndex}`);
            const awayGoalsInput = matchDiv.querySelector(`#away-goals-${matchIndex}`);
            homeGoalsInput触摸

            homeGoalsInput.addEventListener('input', () => updateGoalDetails(match, matchIndex, 'home'));
            awayGoalsInput.addEventListener('input', () => updateGoalDetails(match, matchIndex, 'away'));

            inputDiv.appendChild(matchDiv);
            updateGoalDetails(match, matchIndex, 'home');
            updateGoalDetails(match, matchIndex, 'away');
        }
    });
}

// Aggiorna i campi per i dettagli dei gol
function updateGoalDetails(match, matchIndex, teamType) {
    const teamName = teamType === 'home' ? match.home : match.away;
    const team = teams.find(t => t.player === teamName);
    if (!team) return; // Salta se è BYE
    const goalsInput = document.getElementById(`${teamType}-goals-${matchIndex}`);
    const goalsCount = parseInt(goalsInput.value) || 0;
    const detailsDiv = document.getElementById(`${teamType}-goals-details-${matchIndex}`);
    detailsDiv.innerHTML = '';

    for (let i = 0; i < goalsCount; i++) {
        const goalDiv = document.createElement('div');
        goalDiv.innerHTML = `
            Gol ${i + 1}:
            <select id="${teamType}-goal-${matchIndex}-${i}-character" required>
                <option value="">Seleziona Personaggio</option>
                ${team.characters.map(c => `<option value="${c.id}">${c.name} (${c.position})</option>`).join('')}
            </select>
            <input type="number" min="1" max="90" id="${teamType}-goal-${matchIndex}-${i}-minute" placeholder="Minuto" required>
        `;
        detailsDiv.appendChild(goalDiv);
    }
}

// Salva i risultati della giornata/turno
function saveMatchdayResults() {
    const round = competition.data[currentRound];
    let allValid = true;

    round.matches.forEach((match, matchIndex) => {
        if (!match.played && match.home && match.away && match.home !== 'BYE' && match.away !== 'BYE') {
            const homeGoalsInput = document.getElementById(`home-goals-${matchIndex}`);
            const awayGoalsInput = document.getElementById(`away-goals-${matchIndex}`);
            const homeGoals = parseInt(homeGoalsInput.value) || -1;
            const awayGoals = parseInt(awayGoalsInput.value) || -1;

            if (homeGoals < 0 || awayGoals < 0) {
                alert(`Inserisci un numero valido di gol per ${match.home} vs ${match.away}!`);
                allValid = false;
                return;
            }

            const goals = [];
            for (let i = 0; i < homeGoals; i++) {
                const characterSelect = document.getElementById(`home-goal-${matchIndex}-${i}-character`);
                const minuteInput = document.getElementById(`home-goal-${matchIndex}-${i}-minute`);
                const characterId = characterSelect.value;
                const minute = parseInt(minuteInput.value) || -1;

                if (!characterId || minute < 1 || minute > 90) {
                    alert(`Seleziona un personaggio e inserisci un minuto valido (1-90) per il gol ${i + 1} di ${match.home}!`);
                    allValid = false;
                    return;
                }

                const character = teams.find(t => t.player === match.home).characters.find(c => c.id == characterId);
                goals.push({
                    team: match.home,
                    characterId: parseInt(characterId),
                    characterName: character.name,
                    minute
                });
            }

            for (let i = 0; i < awayGoals; i++) {
                const characterSelect = document.getElementById(`away-goal-${matchIndex}-${i}-character`);
                const minuteInput = document.getElementById(`away-goal-${matchIndex}-${i}-minute`);
                const characterId = characterSelect.value;
                const minute = parseInt(minuteInput.value) || -1;

                if (!characterId || minute < 1 || minute > 90) {
                    alert(`Seleziona un personaggio e inserisci un minuto valido (1-90) per il gol ${i + 1} di ${match.away}!`);
                    allValid = false;
                    return;
                }

                const character = teams.find(t => t.player === match.away).characters.find(c => c.id == characterId);
                goals.push({
                    team: match.away,
                    characterId: parseInt(characterId),
                    characterName: character.name,
                    minute
                });
            }

            match.homeGoals = homeGoals;
            match.awayGoals = awayGoals;
            match.goals = goals;
            match.played = true;

            // Aggiorna statistiche per campionato o torneo
            const homeTeam = standings.find(s => s.team === match.home);
            const awayTeam = standings.find(s => s.team === match.away);
            homeTeam.goalsFor += homeGoals;
            homeTeam.goalsAgainst += awayGoals;
            awayTeam.goalsFor += awayGoals;
            awayTeam.goalsAgainst += homeGoals;

            if (competition.type === 'league') {
                if (homeGoals > awayGoals) {
                    homeTeam.points += 3;
                    homeTeam.wins += 1;
                    awayTeam.losses += 1;
                } else if (awayGoals > homeGoals) {
                    awayTeam.points += 3;
                    awayTeam.wins += 1;
                    homeTeam.losses += 1;
                } else {
                    homeTeam.points += 1;
                    awayTeam.points += 1;
                    homeTeam.draws += 1;
                    awayTeam.draws += 1;
                }
            }
        }
    });

    if (allValid) {
        if (competition.type === 'tournament') {
            updateTournamentBracket();
        }
        currentRound++;
        document.getElementById('matchday-input').style.display = 'none';
        displayCalendar();
        if (competition.type === 'league') {
            updateStandings();
        } else {
            updateTournamentStandings();
        }
    }
}

// Aggiorna il bracket del torneo
function updateTournamentBracket() {
    const currentRoundData = competition.data[currentRound];
    const isSemifinals = currentRoundData.round === 'Semifinali';
    const isFinal = currentRoundData.round === 'Finale';
    const nextRound = competition.data[currentRound + 1];

    if (isSemifinals) {
        // Identifica i perdenti per lo spareggio
        const losers = [];
        currentRoundData.matches.forEach(match => {
            if (match.homeGoals > match.awayGoals) {
                losers.push(match.away);
            } else if (match.awayGoals > match.homeGoals) {
                losers.push(match.home);
            }
        });

        // Imposta lo spareggio 3°/4° posto
        const thirdPlaceMatch = competition.data.find(r => r.round === 'Spareggio 3°/4° Posto').matches[0];
        if (losers.length === 2) {
            thirdPlaceMatch.home = losers[0];
            thirdPlaceMatch.away = losers[1];
        }
    }

    if (isFinal) {
        // Assegna 1° e 2° posto
        const finalMatch = currentRoundData.matches[0];
        if (finalMatch.homeGoals > finalMatch.awayGoals) {
            tournamentPositions[0] = { team: finalMatch.home, position: '1°' };
            tournamentPositions[1] = { team: finalMatch.away, position: '2°' };
        } else if (finalMatch.awayGoals > finalMatch.homeGoals) {
            tournamentPositions[0] = { team: finalMatch.away, position: '1°' };
            tournamentPositions[1] = { team: finalMatch.home, position: '2°' };
        }
    }

    if (currentRoundData.round === 'Spareggio 3°/4° Posto') {
        // Assegna 3° e 4° posto
        const thirdPlaceMatch = currentRoundData.matches[0];
        if (thirdPlaceMatch.homeGoals > thirdPlaceMatch.awayGoals) {
            tournamentPositions[2] = { team: thirdPlaceMatch.home, position: '3°' };
            tournamentPositions[3] = { team: thirdPlaceMatch.away, position: '4°' };
        } else if (thirdPlaceMatch.awayGoals > thirdPlaceMatch.homeGoals) {
            tournamentPositions[2] = { team: thirdPlaceMatch.away, position: '3°' };
            tournamentPositions[3] = { team: thirdPlaceMatch.home, position: '4°' };
        }
    }

    // Aggiorna il turno successivo
    if (nextRound && nextRound.round !== 'Spareggio 3°/4° Posto') {
        const winners = [];
        currentRoundData.matches.forEach(match => {
            if (match.homeGoals > match.awayGoals) {
                winners.push(match.home);
            } else if (match.awayGoals > match.homeGoals) {
                winners.push(match.away);
            }
        });

        for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
                nextRound.matches[i / 2].home = winners[i];
                nextRound.matches[i / 2].away = winners[i + 1];
            }
        }
    }
}

// Esporta i risultati della competizione
function exportResults() {
    const resultsData = {
        teams: teams,
        competition: competition,
        standings: competition.type === 'league' ? standings : tournamentPositions,
        timestamp: new Date().toISOString()
    };

    const jsonStr = JSON.stringify(resultsData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${competition.type}_results_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
