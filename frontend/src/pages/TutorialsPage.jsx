import MobileLayout from "../layouts/MobileLayout";
import DesktopLayout from "../layouts/DesktopLayout";


const tutorials = [
  {
    title: "How to Create an Account",
    description: "Learn how to create a CommHub account.",
    video: "/videos/create_account.mp4",
  },
  {
    title: "How to Post a Service",
    description: "Learn how to post a service on CommHub.",
    video: "/videos/post_service.mp4",
  },
  {
    title: "How to Join a Workshop",
    description: "Learn how to find and join workshops.",
    video: "/videos/join_workshop.mp4",
  },
  {
    title: "How to Edit Your Profile",
    description: "Learn how to update your CommHub profile.",
    video: "/videos/delete_modify_account.mp4",
  },
];



export default function TutorialsPage() {
  return (
    <>
       <div className="mobile-only">
        <MobileLayout title="Tutorials">

          <h1>Video Tutorials</h1>

          <p>
            Watch these tutorials to learn how to use CommHub.
          </p>

          {tutorials.map((tutorial) => (
            <div key={tutorial.video}>

              <h2>{tutorial.title}</h2>

              <p>{tutorial.description}</p>

              <video
                width="100%"
                height="250"
                controls
                preload="metadata"
              >
                <source src={tutorial.video} type="video/mp4" />
                Your browser does not support video playback.
              </video>

            </div>
          ))}

        </MobileLayout>
      </div>

      <div className="desktop-only">
        <DesktopLayout>

          <h1>Video Tutorials</h1>

          <p>
            Watch these tutorials to learn how to use CommHub.
          </p>

          {tutorials.map((tutorial) => (
            <div key={tutorial.video}>

              <h2>{tutorial.title}</h2>

              <p>{tutorial.description}</p>

              <video
              width="560"
              height="315"
              controls
              preload="metadata"
              >
              <source src={tutorial.video} type="video/mp4" />
              Your browser does not support video playback.
            </video>

            </div>
          ))}

        </DesktopLayout>
      </div>
    </>
  );
}