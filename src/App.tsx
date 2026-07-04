import { HomePane } from "./panes/HomePane";
import { NotesPane } from "./panes/NotesPane";
import { PlansPane } from "./panes/PlansPane";
import { SchedulePane } from "./panes/SchedulePane";

function App() {
  return (
    <main className="dashboard">
      <HomePane />
      <NotesPane />
      <PlansPane />
      <SchedulePane />
    </main>
  );
}

export default App;
