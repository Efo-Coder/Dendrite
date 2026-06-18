import WorkspaceView from './WorkspaceView';

// App shell for authenticated users. Phase 4 adds the appView switch
// (Home dashboard vs. workspace); for now it renders the workspace directly.
const DashboardPage = () => {
  return <WorkspaceView />;
};

export default DashboardPage;
