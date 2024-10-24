import _ from 'lodash';
import { Row, Col, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Contributor from './additionalComponents/Contributor';
import contributors from './data/contributors.json';
import './FullAcknowledgement.css';
import DiscordButton from './additionalComponents/DiscordButton';

function ContributorTable({
    contributorsList,
}: {
    contributorsList: {
        name: string;
        links: { [platform: string]: string | undefined };
        attributions: string[];
    }[];
}) {
    return (
        <>
            {_.map(contributorsList, (contributor) => (
                <Col>
                    <Row>
                        <Col>
                            <Contributor
                                name={contributor.name}
                                links={contributor.links}
                            />
                        </Col>
                    </Row>
                    {_.map(contributor.attributions, (attribution) => (
                        <Row>
                            <Col>{attribution}</Col>
                        </Row>
                    ))}
                </Col>
            ))}
        </>
    );
}

export default function FullAcknowledgement() {
    return (
        <Container className="ack-container">
            <Row>
                <Col>
                    <Link to="/">Return to Tracker</Link>
                </Col>
            </Row>
            <Row>
                <Col className="ack-group-header">Lead Developer</Col>
            </Row>
            {_.map(contributors.creators, (creator) => (
                <Contributor name={creator.name} links={creator.links} />
            ))}
            <Row />
            <Row>
                <Col className="ack-group-header">Contributors</Col>
            </Row>
            <Row>
                <ContributorTable
                    contributorsList={contributors.contributors}
                />
            </Row>
            <Row>
                <Col className="ack-group-header">Additional Shoutouts</Col>
            </Row>
            <Row>
                <ContributorTable
                    contributorsList={contributors.additionalShoutouts}
                />
            </Row>
            <Row>
                <Col>
                    <span style={{ padding: '1%' }}>
                        <a href="https://github.com/robojumper/SS-Randomizer-Tracker/tree/new-logic-tracker">
                            View the Source Code
                            <i
                                style={{ paddingLeft: '0.3%' }}
                                className="fab fa-github"
                            />
                        </a>
                    </span>
                    <span>
                        <DiscordButton />
                    </span>
                </Col>
            </Row>
        </Container>
    );
}
