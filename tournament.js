// Stato globale
let teams = [];
let charactersData = [];
let calendar = [];
let standings = [];
let currentMatchday = 0;

// Carica i dati dei personaggi (statistiche)
document.addEventListener('DOMContentLoaded', () => {
    fetch('data/characters.json')
        .then(response => {
            if (!response.ok) throw new Error('Errore nel caricamento di characters.json');
            return response.json();
        })
        .then(data => {
            charactersData = data;
        })
        .catch(error => {
            console.error('Errore:', error);
            alert('Impossibile caricare i personaggi. Verifica che data/characters.json esista.');
        });
});

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
                awayGoals: 0
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
            li.textContent = `${match.home} vs ${match.away}${match.played ? `: ${match.homeGoals} - ${match.awayGoals}` : ''}`;
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

// Simula una giornata
function simulateMatchday() {
    if (currentMatchday >= calendar.length) {
        alert('Campionato completato!');
        return;
    }

    const day = calendar[currentMatchday];
    day.matches.forEach(match => {
        if (!match.played) {
            const result = simulateMatch(match.home, match.away);
            match.homeGoals = result.homeGoals;
            match.awayGoals = result.awayGoals;
            match.played = true;

            // Aggiorna classifica
            const homeTeam = standings.find(s => s.team === match.home);
            const awayTeam = standings.find(s => s.team === match.away);
            homeTeam.goalsFor += result.homeGoals;
            homeTeam.goalsAgainst += result.awayGoals;
            awayTeam.goalsFor += result.awayGoals;
            awayTeam.goalsAgainst += result.homeGoals;

            if (result.homeGoals > result.awayGoals) {
                homeTeam.points += 3;
                homeTeam.wins += 1;
                awayTeam.losses += 1;
            } else if (result.awayGoals > result.homeGoals) {
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

    currentMatchday++;
    displayCalendar();
    updateStandings();
}

// Simula tutte le giornate
function simulateAll() {
    while (currentMatchday < calendar.length) {
        simulateMatchday();
    }
}

// Simula una partita
function simulateMatch(homePlayer, awayPlayer) {
    const homeTeam = teams.find(t => t.player === homePlayer);
    const awayTeam = teams.find(t => t.player === awayPlayer);

    // Calcola la forza della squadra basata sulle statistiche dei personaggi
    const homeStrength = calculateTeamStrength(homeTeam);
    const awayStrength = calculateTeamStrength(awayTeam);

    // Simulazione semplice basata sulla forza
    const homeGoals = Math.floor(Math.random() * 5 * (homeStrength / (homeStrength + awayStrength)));
    const awayGoals = Math.floor(Math.random() * 5 * (awayStrength / (homeStrength + awayStrength)));

    return { homeGoals, awayGoals };
}

// Calcola la forza di una squadra
function calculateTeamStrength(team) {
    let totalStrength = 0;
    team.characters.forEach(char => {
        const charData = charactersData.find(c => c.id === char.id);
        if (charData) {
            totalStrength += charData.total || 50; // Usa 'total' o un valore predefinito
        }
    });
    return totalStrength / team.characters.length || 1; // Media per evitare divisioni per zero
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
