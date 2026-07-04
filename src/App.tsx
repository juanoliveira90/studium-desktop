import { TopBar } from "./components/TopBar";
import { HomePane } from "./panes/HomePane";
import { NotesPane } from "./panes/NotesPane";
import { PlansPane } from "./panes/PlansPane";
import { SchedulePane } from "./panes/SchedulePane";

function App() {
  return (
    <div className="shell">
      <TopBar />
      <main className="dashboard">
        <HomePane />
        <NotesPane />
        <PlansPane />
        <SchedulePane />
      </main>
    </div>
  );
}

export default App;
