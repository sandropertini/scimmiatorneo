// Stato globale
let teams = [];
let calendar = [];
let standings = [];
let currentMatchday = 0;

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

// Genera il calendario del campionato (andata e ritorno)
function generateLeague() {
    if (teams.length < 2) {
        alert('Sono necessarie almeno 2 squadre per generare un campionato!');
        return;
    }

    calendar = [];
    const teamNames = teams.map(t => t.player);
    const numTeams = teamNames.length;
    const numMatchdays = (numTeams - 1) * 2; // Andata e ritorno
    const matchesPerDay = numTeams / 2;

    // Genera incontri
    for (let matchday = 0; matchday < numMatchdays; matchday++) {
        const matches = [];
        for (let i = 0; i < matchesPerDay; i++) {
            const home = (i + matchday) % (numTeams - 1);
            let away = (numTeams - 1 - i + matchday) % (numTeams - 1);
            if (i === 0) away = numTeams - 1; // Ultima squadra
            const isReturn = matchday >= numTeams - 1;
            matches.push({
                home: isReturn ? teamNames[away] : teamNames[home],
                away: isReturn ? teamNames[home] : teamNames[away],
                played: false,
                homeGoals: 0,
                awayGoals: 0,
                goals: [] // Array per dettagli gol: { team, characterId, characterName, minute }
            });
        }
        calendar.push({ matchday: matchday + 1, matches });
    }

    // Inizializza la classifica
    standings = teams.map(team => ({
        team: team.player,
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0
    }));

    currentMatchday = 0;
    displayCalendar();
    updateStandings();
    document.getElementById('league-section').style.display = 'block';
}

// Visualizza il calendario
function displayCalendar() {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';
    calendar.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.innerHTML = `<h4>Giornata ${day.matchday}</h4>`;
        const ul = document.createElement('ul');
        day.matches.forEach(match => {
            const li = document.createElement('li');
            let resultText = `${match.home} vs ${match.away}`;
            if (match.played) {
                resultText += `: ${match.homeGoals} - ${match.awayGoals}`;
                const goalDetails = match.goals.map(goal => `${goal.characterName} (${goal.team}) al ${goal.minute}'`).join(', ');
                if (goalDetails) resultText += ` (${goalDetails})`;
            }
            li.textContent = resultText;
            ul.appendChild(li);
        });
        dayDiv.appendChild(ul);
        calendarDiv.appendChild(dayDiv);
    });
}

// Aggiorna la classifica
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

// Inizia l'inserimento dei risultati per una giornata
function startMatchdayInput() {
    if (currentMatchday >= calendar.length) {
        alert('Campionato completato!');
        return;
    }

    const day = calendar[currentMatchday];
    const inputDiv = document.getElementById('match-results-input');
    inputDiv.innerHTML = '';
    document.getElementById('current-matchday').textContent = day.matchday;
    document.getElementById('matchday-input').style.display = 'block';

    day.matches.forEach((match, matchIndex) => {
        if (!match.played) {
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

            // Aggiungi listener per aggiornare i dettagli dei gol
            const homeGoalsInput = matchDiv.querySelector(`#home-goals-${matchIndex}`);
            const awayGoalsInput = matchDiv.querySelector(`#away-goals-${matchIndex}`);
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

// Salva i risultati della giornata
function saveMatchdayResults() {
    const day = calendar[currentMatchday];
    let allValid = true;

    day.matches.forEach((match, matchIndex) => {
        if (!match.played) {
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
            // Raccogli dettagli gol casa
            for (let i = 0; i < homegoals; i++) {
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

            // Raccogli dettagli gol trasferta
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

            // Aggiorna partita
            match.homeGoals = homeGoals;
            match.awayGoals = awayGoals;
            match.goals = goals;
            match.played = true;

            // Aggiorna classifica
            const homeTeam = standings.find(s => s.team === match.home);
            const awayTeam = standings.find(s => s.team === match.away);
            homeTeam.goalsFor += homeGoals;
            homeTeam.goalsAgainst += awayGoals;
            awayTeam.goalsFor += awayGoals;
            awayTeam.goalsAgainst += homeGoals;

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
    });

    if (allValid) {
        currentMatchday++;
        document.getElementById('matchday-input').style.display = 'none';
        displayCalendar();
        updateStandings();
    }
}

// Esporta i risultati del campionato
function exportResults() {
    const resultsData = {
        teams: teams,
        calendar: calendar,
        standings: standings,
        timestamp: new Date().toISOString()
    };

    const jsonStr = JSON.stringify(resultsData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `league_results_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
