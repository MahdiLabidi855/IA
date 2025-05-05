import DashboardBannerTwo from "../../dashboard-common/DashboardBannerTwo"
import DashboardSidebarTwo from "../../dashboard-common/DashboardSidebarTwo"
import StudentProfileContent from "../../student-dashboard/student-profile/StudentProfileContent"

const StudentProfileArea = () => {
   return (
      <section className="dashboard__area section-pb-120">
         <div className="container">
            <DashboardBannerTwo />
            <div className="dashboard__inner-wrap">
               <div className="row">
                  <DashboardSidebarTwo />
                  <StudentProfileContent style={false} />
               </div>
            </div>
         </div>
      </section>
   )
}

export default StudentProfileArea
