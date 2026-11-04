import { Link } from 'react-router-dom';
import { COMPANIES } from '../data/companies';
import { Ltr } from '../ui/Ltr';

/** שם חברה שקיים כישות במערכת הופך לקישור לפרופיל */
export default function CompanyRef({ name }) {
  const c = COMPANIES.find((x) => x.name === name);
  return c ? <Link to={`/companies/${c.id}`} className="link"><Ltr>{name}</Ltr></Link> : <Ltr>{name}</Ltr>;
}
