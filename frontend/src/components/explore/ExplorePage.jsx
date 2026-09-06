import TenderXLanding from '../landing/TenderXLanding';

// Public marketing surface; authenticated dashboards remain unchanged.
export default function ExplorePage({ onOpenLogin, onOpenRegister }) {
  return <TenderXLanding onOpenLogin={onOpenLogin} onOpenRegister={onOpenRegister} />;
}
