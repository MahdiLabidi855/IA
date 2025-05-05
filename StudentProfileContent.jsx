import { useEffect, useState } from "react";
import axios from "axios";

const StudentProfileContent = ({ style }) => {
  const [user, setUser] = useState({});
  const [editableUser, setEditableUser] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const data = localStorage.getItem("data");

      if (data) {
        try {
          const parsed = JSON.parse(data);
          const userId = parsed?.id;

          if (!userId) {
            setErrorMsg("User ID is missing.");
            return;
          }

          const res = await axios.get(
            `${import.meta.env.VITE_API_URL}/users/getUser/${userId}`,
            { withCredentials: true }
          );

          setUser(res.data.user);
          setEditableUser(res.data.user);
        } catch (err) {
          console.error("Error fetching user:", err);
          setErrorMsg("An error occurred or access was denied.");
        }
      } else {
        setErrorMsg("No user data found in localStorage.");
      }
    };

    fetchUser();
  }, []);

  const handleChange = (e) => {
    setEditableUser({ ...editableUser, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setSelectedImage(e.target.files[0]);
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();

      // Append fields
      formData.append("username", editableUser.username || "");
      formData.append("firstName", editableUser.firstName || "");
      formData.append("lastName", editableUser.lastName || "");
      formData.append("email", editableUser.email || "");
      formData.append("tel", editableUser.tel || "");
      formData.append("occupation", editableUser.occupation || "");
      formData.append("bio", editableUser.bio || "");

      // Append image file if selected
      if (selectedImage) {
        formData.append("photo", selectedImage);
      }

      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/users/UpdateUser/${user.id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      setUser(res.data.user);
      setEditableUser(res.data.user);
      setIsEditing(false);
      setSelectedImage(null);
      console.log('hhh',`${import.meta.env.VITE_API_URL}${user.photo}`);
      
    } catch (err) {
      console.error("Error updating user:", err);
      setErrorMsg("Failed to update user.");
    }
  };

  return (
    <div className="dashboard__content-wrap" style={{ maxWidth: "900px" }}>
      <div className="dashboard__content-title">
        <h4 className="title">My Profile</h4>
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel" : "Edit"}
        </button>
      </div>
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      <div className="row">
        <div className="col-lg-12">
          <div className="profile__content-wrap">
            <ul className="list-wrap">
              <li>
                <span>Registration Date</span> February 28, 2026
              </li>
              <li>
                <span>First Name</span>{" "}
                {isEditing ? (
                  <input
                    name="firstName"
                    value={editableUser.firstName || ""}
                    onChange={handleChange}
                  />
                ) : (
                  user?.firstName || "N/A"
                )}
              </li>
              <li>
                <span>Last Name</span>{" "}
                {isEditing ? (
                  <input
                    name="lastName"
                    value={editableUser.lastName || ""}
                    onChange={handleChange}
                  />
                ) : (
                  user?.lastName || "N/A"
                )}
              </li>
              <li>
                <span>Username</span>{" "}
                {isEditing ? (
                  <input
                    name="username"
                    value={editableUser.username || ""}
                    onChange={handleChange}
                  />
                ) : (
                  user?.username || "N/A"
                )}
              </li>
              <li>
                <span>Email</span>{" "}
                {isEditing ? (
                  <input
                    name="email"
                    value={editableUser.email || ""}
                    onChange={handleChange}
                  />
                ) : (
                  user?.email || "example@gmail.com"
                )}
              </li>
              <li>
                <span>Phone Number</span>{" "}
                {isEditing ? (
                  <input
                    name="tel"
                    value={editableUser.tel || ""}
                    onChange={handleChange}
                  />
                ) : (
                  user?.tel || "+1-202-555-0174"
                )}
              </li>
              <li>
                <span>Skill/Occupation</span>{" "}
                {isEditing ? (
                  <input
                    name="occupation"
                    value={editableUser.occupation || ""}
                    onChange={handleChange}
                  />
                ) : (
                  user?.occupation || "N/A"
                )}
              </li>
              <li>
                <span>Biography</span>{" "}
                {isEditing ? (
                  <textarea
                    name="bio"
                    value={editableUser.bio || ""}
                    onChange={handleChange}
                  />
                ) : (
                  user?.bio ||
                  `I'm a Front-End Developer passionate about UI and user experience.`
                )}
              </li>
              <li>
                <span>Profile Picture</span>
                {isEditing ? (
                  <>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    {selectedImage && <p>{selectedImage.name}</p>}
                  </>
                ) : (
                  <img
                    src={
                      user?.photo
                        ? `${import.meta.env.VITE_API_URL}${user.photo}`
                        : "http://localhost:3000/assets/uploads/1746128922729-855346037.png"
                    }
                    alt="Profile"
                    width="100"
                    style={{ borderRadius: "50px", objectFit: "cover" }}
                  />
                )}
              </li>
            </ul>
            {isEditing && (
              <button
                style={{ marginTop: "10px", padding: "8px 16px" }}
                onClick={handleSave}
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfileContent;
