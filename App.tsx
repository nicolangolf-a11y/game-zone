import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type Game = {
  id: number;
  title: string;
  genre: string;
  platform: string;
  image: string;
  rating: number;
};

type GameList = {
  id: number;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

const games: Game[] = [
  {
    id: 1,
    title: "Cyber Legends",
    genre: "Action RPG",
    platform: "PC · PS5 · Xbox",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
  },
  {
    id: 2,
    title: "Speed Horizon",
    genre: "Rennspiel",
    platform: "PC · PS5",
    image:
      "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
  },
  {
    id: 3,
    title: "Galaxy Warriors",
    genre: "Shooter",
    platform: "PC · Xbox",
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
    rating: 4.9,
  },
  {
    id: 4,
    title: "Fantasy Quest",
    genre: "Fantasy RPG",
    platform: "PC · PS5",
    image:
      "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
  },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [lists, setLists] = useState<GameList[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selected, setSelected] = useState<GameList | null>(null);
  const [page, setPage] = useState<"games" | "play" | "lists">("games");
  const [loading, setLoading] = useState(true);

  const [board, setBoard] = useState<(string | null)[]>(
    Array(9).fill(null)
  );
  const [turn, setTurn] = useState<"X" | "O">("X");

  const loadFavorites = async () => {
    const { data, error } = await supabase
      .from("favorites")
      .select("game_id");

    if (!error) {
      setFavorites((data ?? []).map((x) => x.game_id));
    }
  };

  const loadLists = async () => {
    const { data, error } = await supabase
      .from("game_lists")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setLists(data ?? []);
    }
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        await loadFavorites();
        await loadLists();
      }

      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        void loadFavorites();
        void loadLists();
      } else {
        setFavorites([]);
        setLists([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const auth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (register) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      setMessage(
        error
          ? error.message
          : "Konto erstellt. Prüfe ggf. deine E-Mail."
      );
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) setMessage(error.message);
    }
  };

  const fav = async (id: number) => {
    if (!user) return;

    const yes = favorites.includes(id);

    const query = yes
      ? supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("game_id", id)
      : supabase
          .from("favorites")
          .insert({ user_id: user.id, game_id: id });

    const { error } = await query;

    if (error) {
      setMessage(error.message);
      return;
    }

    setFavorites((current) =>
      yes
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !name.trim()) return;

    const { data, error } = await supabase
      .from("game_lists")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: desc.trim() || null,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setLists((current) => [data, ...current]);
    setName("");
    setDesc("");
    setMessage("Liste erstellt! 🎮");
  };

  const removeList = async (id: number) => {
    const { error } = await supabase
      .from("game_lists")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setLists((current) =>
      current.filter((list) => list.id !== id)
    );

    if (selected?.id === id) {
      setSelected(null);
    }
  };

  const add = async (listId: number, gameId: number) => {
    const { error } = await supabase
      .from("game_list_items")
      .insert({
        list_id: listId,
        game_id: gameId,
      });

    setMessage(
      error
        ? error.code === "23505"
          ? "Spiel ist bereits in der Liste."
          : error.message
        : "Spiel hinzugefügt! 🎮"
    );
  };

  const winner = () => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (
        board[a] &&
        board[a] === board[b] &&
        board[a] === board[c]
      ) {
        return board[a];
      }
    }

    return null;
  };

  const ticWinner = winner();
  const draw = !ticWinner && board.every(Boolean);

  const playMove = (index: number) => {
    if (board[index] || ticWinner) return;

    const nextBoard = [...board];
    nextBoard[index] = turn;

    setBoard(nextBoard);
    setTurn(turn === "X" ? "O" : "X");
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
  };

  if (loading) {
    return (
      <div className="loading">
        🎮 GameZone wird geladen...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="logo">🎮</div>

          <h1>GameZone</h1>

          <p>Deine Gaming-Welt an einem Ort.</p>

          <form onSubmit={auth}>
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Passwort (mind. 6 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />

            <button className="primary">
              {register ? "Konto erstellen" : "Anmelden"}
            </button>
          </form>

          {message && (
            <div className="message">{message}</div>
          )}

          <button
            className="link-button"
            onClick={() => {
              setRegister(!register);
              setMessage("");
            }}
          >
            {register
              ? "Ich habe bereits ein Konto"
              : "Neues Konto erstellen"}
          </button>
        </div>
      </div>
    );
  }

  const filtered = games.filter((game) =>
    game.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          🎮 <strong>GameZone</strong>
        </div>

        <nav>
          <button
            className={page === "games" ? "nav-active" : ""}
            onClick={() => setPage("games")}
          >
            🎮 Entdecken
          </button>

          <button
            className={page === "play" ? "nav-active" : ""}
            onClick={() => setPage("play")}
          >
            🕹️ Spielen
          </button>

          <button
            className={page === "lists" ? "nav-active" : ""}
            onClick={() => setPage("lists")}
          >
            📚 Meine Listen
          </button>
        </nav>

        <div className="account">
          <span>👤 {user.email}</span>

          <button
            onClick={() => supabase.auth.signOut()}
          >
            Abmelden
          </button>
        </div>
      </header>

      {page === "games" && (
        <>
          <section className="hero">
            <span className="badge">
              GAMING COMMUNITY
            </span>

            <h1>
              Entdecke dein
              <br />
              nächstes <span>Game.</span>
            </h1>

            <p>
              Entdecke Spiele, speichere deine
              Favoriten und erstelle eigene
              Spielelisten.
            </p>

            <input
              className="search"
              placeholder="🔍 Spiel suchen..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </section>

          <main className="content">
            <div className="section-title">
              <div>
                <h2>🔥 Beliebte Spiele</h2>
                <p>
                  Entdecke Spiele aus verschiedenen
                  Genres.
                </p>
              </div>

              <div className="stats">
                ⭐ {favorites.length} Favoriten
              </div>
            </div>

            <div className="games">
              {filtered.map((game) => (
                <article
                  className="game-card"
                  key={game.id}
                >
                  <img
                    src={game.image}
                    alt={game.title}
                  />

                  <div className="game-info">
                    <div className="game-top">
                      <span className="genre">
                        {game.genre}
                      </span>

                      <span className="rating">
                        ⭐ {game.rating}
                      </span>
                    </div>

                    <h3>{game.title}</h3>
                    <p>{game.platform}</p>

                    <div className="game-actions">
                      <button
                        className={
                          favorites.includes(game.id)
                            ? "favorite active"
                            : "favorite"
                        }
                        onClick={() =>
                          void fav(game.id)
                        }
                      >
                        {favorites.includes(game.id)
                          ? "★ Favorit"
                          : "☆ Favorit"}
                      </button>

                      {lists.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const id = Number(
                              e.target.value
                            );

                            if (id) {
                              void add(id, game.id);
                            }

                            e.target.value = "";
                          }}
                        >
                          <option value="">
                            ➕ Zur Liste
                          </option>

                          {lists.map((list) => (
                            <option
                              key={list.id}
                              value={list.id}
                            >
                              {list.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </main>
        </>
      )}

      {page === "play" && (
        <main className="content">
          <div className="section-title">
            <div>
              <h2>🕹️ Jetzt spielen</h2>
              <p>
                Spiele direkt in GameZone oder entdecke
                kostenlose Browser-Spiele.
              </p>
            </div>
          </div>

          <section className="create-list">
            <h2>❌⭕ Tic-Tac-Toe</h2>

            <p>
              Spiele direkt hier gegen einen Freund.
            </p>

            <h3>
              {ticWinner
                ? `🎉 ${ticWinner} gewinnt!`
                : draw
                ? "🤝 Unentschieden!"
                : `Am Zug: ${turn}`}
            </h3>

            <div className="tic-board">
              {board.map((cell, index) => (
                <button
                  key={index}
                  className="tic-cell"
                  onClick={() => playMove(index)}
                >
                  {cell}
                </button>
              ))}
            </div>

            <button
              className="primary"
              onClick={resetGame}
            >
              🔄 Neu starten
            </button>
          </section>

          <section className="browser-games">
            <h2>🌐 Browser-Spiele</h2>

            <p>
              Öffne kostenlose Spiele direkt in deinem
              Browser.
            </p>

            <div className="games">
              <article className="game-card">
                <div className="game-info">
                  <h3>🎮 CrazyGames</h3>

                  <p>
                    Viele kostenlose Spiele aus
                    verschiedenen Genres.
                  </p>

                  <button
                    className="primary"
                    onClick={() =>
                      window.open(
                        "https://www.crazygames.com/de",
                        "_blank"
                      )
                    }
                  >
                    Jetzt entdecken →
                  </button>
                </div>
              </article>

              <article className="game-card">
                <div className="game-info">
                  <h3>🕹️ itch.io</h3>

                  <p>
                    Entdecke Indie- und Browser-Spiele.
                  </p>

                  <button
                    className="primary"
                    onClick={() =>
                      window.open(
                        "https://itch.io/games/platform-web",
                        "_blank"
                      )
                    }
                  >
                    Web-Spiele entdecken →
                  </button>
                </div>
              </article>
            </div>
          </section>
        </main>
      )}

      {page === "lists" && (
        <main className="content lists-page">
          <div className="section-title">
            <div>
              <h2>📚 Meine Spielelisten</h2>
              <p>
                Organisiere deine Spiele nach deinen
                eigenen Kategorien.
              </p>
            </div>
          </div>

          <section className="create-list">
            <h3>➕ Neue Liste erstellen</h3>

            <form onSubmit={createList}>
              <input
                placeholder="Name, z. B. Meine RPGs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                required
              />

              <input
                placeholder="Beschreibung (optional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />

              <button className="primary">
                Liste erstellen
              </button>
            </form>
          </section>

          {message && (
            <div className="message">{message}</div>
          )}

          <div className="lists">
            {lists.map((list) => (
              <article
                className="list-card"
                key={list.id}
              >
                <div className="list-icon">📁</div>

                <div>
                  <h3>{list.name}</h3>
                  <p>
                    {list.description ||
                      "Keine Beschreibung"}
                  </p>
                </div>

                <div className="list-actions">
                  <button
                    onClick={() => setSelected(list)}
                  >
                    Öffnen
                  </button>

                  <button
                    className="danger"
                    onClick={() =>
                      void removeList(list.id)
                    }
                  >
                    Löschen
                  </button>
                </div>
              </article>
            ))}
          </div>

          {lists.length === 0 && (
            <div className="empty">
              <div>📚</div>
              <h3>Noch keine Spielelisten</h3>
              <p>
                Erstelle deine erste persönliche
                Spieleliste.
              </p>
            </div>
          )}

          {selected && (
            <section className="selected-list">
              <div className="section-title">
                <div>
                  <h2>📁 {selected.name}</h2>
                  <p>{selected.description}</p>
                </div>

                <button
                  onClick={() => setSelected(null)}
                >
                  Schließen
                </button>
              </div>

              <h3>Spiele hinzufügen</h3>

              <div className="games">
                {games.map((game) => (
                  <article
                    className="small-game"
                    key={game.id}
                  >
                    <img
                      src={game.image}
                      alt={game.title}
                    />

                    <div>
                      <strong>{game.title}</strong>
                      <p>{game.genre}</p>

                      <button
                        onClick={() =>
                          void add(
                            selected.id,
                            game.id
                          )
                        }
                      >
                        ➕ Hinzufügen
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
